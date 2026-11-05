import { useMemo } from "react";
import { Download } from "lucide-react";

import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { AriaComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

import { Button } from "@/components/ui/button";
import { useECharts } from "@/hooks/useECharts";
import { downloadChartSvg } from "@/lib/charts/download-svg";
import { formatNumber } from "@/lib/formatters";

import {
  buildRaceChartOptions,
  getRaceColor,
  getTotalSelections,
} from "./race-chart-options";
import type { RaceDistributionData } from "../types";

echarts.use([PieChart, TooltipComponent, AriaComponent, SVGRenderer]);

interface RaceDistributionChartProps {
  data: readonly RaceDistributionData[];
  cohortCount: number;
}

export function RaceDistributionChart({
  data,
  cohortCount,
}: RaceDistributionChartProps) {
  const total = useMemo(() => getTotalSelections(data), [data]);
  const chartOptions = useMemo(() => buildRaceChartOptions(data), [data]);
  const { containerRef, chartRef } = useECharts(chartOptions, {
    enabled: total > 0,
  });

  return (
    <section className="w-full min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Recorded race selections</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            downloadChartSvg(chartRef.current, "race-distribution")
          }
        >
          <Download data-icon="inline-start" aria-hidden="true" />
          Export SVG
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <figure className="m-0 min-w-0">
          <div ref={containerRef} className="h-80 w-full min-w-0 sm:h-100" />

          <figcaption className="sr-only">
            Race distribution pie chart showing the percentage of recorded race
            selections. Participants may select multiple categories.
          </figcaption>
        </figure>

        <div className="min-w-0 space-y-4">
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground">Race selections</p>
            <p className="text-3xl font-semibold tabular-nums">
              {formatNumber(total)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {formatNumber(cohortCount)} selected{" "}
              {cohortCount === 1 ? "cohort" : "cohorts"}
            </p>
          </div>
          <ul aria-label="Race selection breakdown" className="space-y-3">
            {data
              .filter((row) => row.value > 0)
              .map((row) => {
                const percentage = total > 0 ? (row.value / total) * 100 : 0;
                return (
                  <li
                    key={row.name}
                    className="flex min-w-0 items-start justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-1 size-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: getRaceColor(row.name) }}
                      />
                      <span className="wrap-anywhere">{row.name}</span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="font-medium">
                        {percentage < 1
                          ? percentage.toFixed(2)
                          : percentage.toFixed(1)}
                        %
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatNumber(row.value)}
                      </span>
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        Each slice is a share of selected race responses, not of unique
        participants. Participants may select multiple categories. Unknown and
        unselected responses do not contribute to the pie. Cohorts are weighted
        by their number of selections.
      </p>
    </section>
  );
}
