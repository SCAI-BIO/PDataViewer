import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import * as echarts from "echarts/core";
import { BoxplotChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ColorIndicator } from "@/components/data-display/ColorIndicator";
import { Button } from "@/components/ui/button";
import { useECharts } from "@/hooks/useECharts";
import { useIsMobile } from "@/hooks/useIsMobile";
import { downloadChartSvg } from "@/lib/charts/download-svg";
import { formatNumber, formatMeasurement } from "@/lib/formatters";

import {
  buildBiomarkerChartOptions,
  prepareBiomarkerDistributions,
} from "./biomarker-chart-options";
import type { BiomarkerDistribution } from "../types";

echarts.use([
  BoxplotChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
  SVGRenderer,
]);

const EMPTY_COLORS: Readonly<Record<string, string>> = {};

interface BiomarkerBoxplotProps {
  distributions: readonly BiomarkerDistribution[];
  colors?: Readonly<Record<string, string>>;
  title?: string;
}

interface MobileSelection {
  readonly title: string;
  readonly labels: readonly string[];
}

export function BiomarkerBoxplot({
  distributions,
  colors = EMPTY_COLORS,
  title = "Biomarker distributions",
}: BiomarkerBoxplotProps) {
  const isMobile = useIsMobile();

  const [mobileSelection, setMobileSelection] =
    useState<MobileSelection | null>(null);

  const prepared = useMemo(
    () => prepareBiomarkerDistributions(distributions, colors),
    [distributions, colors],
  );

  const defaultNames = useMemo(
    () => prepared.slice(0, 2).map((group) => group.label),
    [prepared],
  );

  const selectedNames = useMemo(() => {
    if (!mobileSelection || mobileSelection.title !== title) {
      return defaultNames;
    }

    const available = new Set(prepared.map((group) => group.label));

    const valid = mobileSelection.labels.filter((name) => available.has(name));

    return valid.length > 0 ? valid : defaultNames;
  }, [mobileSelection, title, prepared, defaultNames]);

  const visibleGroups = useMemo(() => {
    if (!isMobile) return prepared;

    const selected = new Set(selectedNames);

    return prepared.filter((group) => selected.has(group.label));
  }, [prepared, selectedNames, isMobile]);

  const legendCohorts = [
    ...new Map(
      visibleGroups.map(({ cohort, color }) => [cohort, color] as const),
    ),
  ];

  const chartOptions = useMemo(
    () => buildBiomarkerChartOptions(visibleGroups, isMobile, title),
    [visibleGroups, isMobile, title],
  );

  const hasData = visibleGroups.length > 0;

  const { containerRef, chartRef } = useECharts(chartOptions, {
    enabled: hasData,
  });

  const excludedGroups = distributions.length - prepared.length;

  const plotMinWidth = isMobile
    ? Math.max(310, visibleGroups.length * 150)
    : Math.max(640, visibleGroups.length * 145);

  function toggleGroup(label: string) {
    const next = selectedNames.includes(label)
      ? selectedNames.filter((name) => name !== label)
      : [...selectedNames, label];

    if (next.length === 0) return;

    setMobileSelection({ title, labels: next });
  }

  return (
    <section className="w-full min-w-0 space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>

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
      </header>

      {/* Focused comparison on mobile */}
      {isMobile && prepared.length > 1 && (
        <div className="space-y-3">
          {prepared.length > 2 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Comparing {visibleGroups.length} of {prepared.length} groups
              </p>

              {visibleGroups.length < prepared.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMobileSelection({
                      title,
                      labels: prepared.map((group) => group.label),
                    })
                  }
                >
                  Show all
                </Button>
              )}
            </div>
          )}

          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Choose groups to compare
            </summary>

            <fieldset className="mt-3 grid gap-3">
              <legend className="sr-only">Distributions to display</legend>

              {prepared.map((group) => (
                <label
                  key={group.label}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedNames.includes(group.label)}
                    disabled={
                      selectedNames.includes(group.label) &&
                      selectedNames.length === 1
                    }
                    onChange={() => toggleGroup(group.label)}
                    className="size-4 shrink-0 accent-primary"
                  />

                  <ColorIndicator color={group.color} />

                  <span className="min-w-0 wrap-anywhere">{group.label}</span>
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
        </div>
      )}

      {/* Chart */}
      {hasData ? (
        <section
          aria-label="Biomarker boxplot"
          className="w-full min-w-0 overflow-x-auto rounded-lg"
        >
          <figure className="m-0">
            <div
              ref={containerRef}
              className="h-105 w-full sm:h-135"
              style={{ minWidth: plotMinWidth }}
            />

            <figcaption className="sr-only">
              {title}. Boxplot comparison of{" "}
              {visibleGroups.map((group) => group.label).join(", ")}. Detailed
              numerical statistics are available below the chart.
            </figcaption>
          </figure>
        </section>
      ) : (
        <EmptyState message="No valid biomarker measurements available" />
      )}

      {/* Cohort legend */}
      {hasData && (
        <ul
          aria-label="Cohort color legend"
          className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          {legendCohorts.map(([cohort, color]) => (
            <li
              key={cohort}
              className="inline-flex min-w-0 items-center gap-2 text-xs sm:text-sm"
            >
              <ColorIndicator color={color} shape="square" className="size-3" />

              <span className="wrap-anywhere text-foreground">{cohort}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Statistical interpretation */}
      {hasData && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Boxes show Q1 to Q3, the central line shows the median, and whiskers
          extend to the most extreme non-outlier observations using the 1.5 x
          IQR rule. Points outside the whiskers represent outliers.
        </p>
      )}

      {excludedGroups > 0 && (
        <output className="block text-xs text-muted-foreground">
          {formatNumber(excludedGroups)}{" "}
          {excludedGroups === 1 ? "group" : "groups"} contained no valid
          numerical measurements and were excluded.
        </output>
      )}

      {/* Accessible numerical summary */}
      {hasData && (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Summary statistics
          </summary>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {visibleGroups.map((group) => {
              const stats = group.stats;

              return (
                <div
                  key={group.label}
                  className="min-w-0 rounded-lg bg-muted/40 p-3"
                >
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold wrap-anywhere">
                    <ColorIndicator color={group.color} />
                    {group.label}
                  </h3>

                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">
                        Observations (n)
                      </dt>
                      <dd className="font-medium">{formatNumber(stats.n)}</dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">Median</dt>
                      <dd className="font-medium">
                        {formatMeasurement(stats.median)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">Q1 - Q3</dt>
                      <dd className="font-medium">
                        {formatMeasurement(stats.q1)} -{" "}
                        {formatMeasurement(stats.q3)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">Mean ± SD</dt>
                      <dd className="font-medium">
                        {formatMeasurement(stats.mean)} ±{" "}
                        {formatMeasurement(stats.standardDeviation)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">Outliers</dt>
                      <dd className="font-medium">
                        {formatNumber(stats.outliers.length)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">
                        Excluded observations
                      </dt>
                      <dd className="font-medium">
                        {formatNumber(stats.excludedCount)}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}
