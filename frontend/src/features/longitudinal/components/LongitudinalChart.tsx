import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

import { ColorIndicator } from "@/components/data-display/ColorIndicator";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import { useECharts } from "@/hooks/useECharts";
import { useIsMobile } from "@/hooks/useIsMobile";
import { downloadChartSvg } from "@/lib/charts/download-svg";

import {
  buildLongitudinalChartOptions,
  getSeriesColor,
} from "./longitudinal-chart-options";
import type { RetentionSeries } from "../utils/retention";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  AriaComponent,
  SVGRenderer,
]);

const EMPTY_COLORS: Readonly<Record<string, string>> = {};

interface LongitudinalChartProps {
  series: readonly RetentionSeries[];
  colors?: Readonly<Record<string, string>>;
  title?: string;
  seriesType?: "cohort" | "variable";
}

export function LongitudinalChart({
  series,
  colors = EMPTY_COLORS,
  title = "Measurement availability over time",
  seriesType = "cohort",
}: LongitudinalChartProps) {
  const isMobile = useIsMobile();

  // null means the default mobile selection.
  const [mobileSelection, setMobileSelection] = useState<string[] | null>(null);

  const defaultNames = useMemo(
    () =>
      series
        .filter((item) => item.points.length > 0)
        .slice(0, 2)
        .map((item) => item.name),
    [series],
  );

  const availableNames = useMemo(
    () => new Set(series.map((item) => item.name)),
    [series],
  );

  const selectedNames = useMemo(() => {
    const validSelection = (mobileSelection ?? defaultNames).filter((name) =>
      availableNames.has(name),
    );

    return validSelection.length > 0 ? validSelection : defaultNames;
  }, [mobileSelection, defaultNames, availableNames]);

  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);

  const effectiveColors = useMemo(
    () =>
      Object.fromEntries(
        series.map((item, index) => [
          item.name,
          getSeriesColor(item.name, index, colors),
        ]),
      ),
    [series, colors],
  );

  const visibleSeries = useMemo(
    () =>
      isMobile ? series.filter((item) => selectedSet.has(item.name)) : series,
    [series, isMobile, selectedSet],
  );

  const hasData = visibleSeries.some((item) => item.points.length > 0);
  const seriesLabel = seriesType === "cohort" ? "cohorts" : "variables";

  const chartOptions = useMemo(
    () =>
      buildLongitudinalChartOptions(
        visibleSeries,
        effectiveColors,
        title,
        isMobile,
      ),
    [visibleSeries, effectiveColors, title, isMobile],
  );

  // Shared ECharts lifecycle: init, update, resize, dispose.
  const { containerRef, chartRef } = useECharts(chartOptions, {
    enabled: hasData,
  });

  function toggleSeries(name: string) {
    setMobileSelection((current) => {
      const base = (current ?? defaultNames).filter((item) =>
        availableNames.has(item),
      );

      if (base.includes(name)) {
        // Always keep at least one series visible.
        return base.length > 1 ? base.filter((item) => item !== name) : base;
      }

      return [...base, name];
    });
  }

  return (
    <section className="w-full min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>

        {hasData && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadChartSvg(chartRef.current, title)}
          >
            <Download data-icon="inline-start" aria-hidden="true" />
            Export SVG
          </Button>
        )}
      </div>

      {/* Mobile series selection */}
      {isMobile && series.length > 1 && (
        <div className="mb-4 space-y-3">
          {series.length > 2 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Comparing {selectedNames.length} of {series.length}{" "}
                {seriesLabel}
              </p>

              {selectedNames.length < series.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMobileSelection(series.map((item) => item.name))
                  }
                >
                  Show all
                </Button>
              )}
            </div>
          )}

          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Choose {seriesLabel} to compare
            </summary>

            <fieldset className="mt-3 grid grid-cols-1 gap-3">
              <legend className="sr-only">
                {seriesType === "cohort" ? "Cohorts" : "Variables"} to display
              </legend>

              {series.map((item) => (
                <label
                  key={item.name}
                  className="flex cursor-pointer items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(item.name)}
                    disabled={
                      selectedSet.has(item.name) && selectedNames.length === 1
                    }
                    onChange={() => toggleSeries(item.name)}
                    className="size-4 accent-primary"
                  />

                  <ColorIndicator color={effectiveColors[item.name]} />
                  <span className="wrap-anywhere">{item.name}</span>
                </label>
              ))}
            </fieldset>

            {mobileSelection !== null && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setMobileSelection(null)}
              >
                Reset selection
              </Button>
            )}
          </details>

          {/* External legend */}
          <ul
            aria-label={`Visible ${seriesType} series`}
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {visibleSeries.map((item) => (
              <li
                key={item.name}
                className="inline-flex items-center gap-1.5 text-xs"
              >
                <ColorIndicator color={effectiveColors[item.name]} />

                <span className="wrap-anywhere">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Chart */}
      {hasData ? (
        <figure className="m-0 w-full min-w-0">
          <div ref={containerRef} className="h-105 w-full min-w-0 sm:h-125" />

          <figcaption className="sr-only">
            {title}. Retention percentage over time for{" "}
            {visibleSeries.map((item) => item.name).join(", ")}. The dashed
            horizontal line marks 50% retention.
          </figcaption>
        </figure>
      ) : (
        <EmptyState message="No longitudinal measurements available" />
      )}

      {/* Interpretation */}
      {hasData && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Each point represents the percentage of participants with an available
          measurement at a given visit, relative to the reported total. Missing
          measurements do not necessarily indicate study dropout. The dashed
          line marks 50% as a visual reference.
        </p>
      )}
    </section>
  );
}
