import type { BoxplotSeriesOption, ScatterSeriesOption } from "echarts/charts";
import type {
  AriaComponentOption,
  GridComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import type { ComposeOption } from "echarts/core";

import { formatMeasurement, formatNumber } from "@/lib/formatters";
import { escapeHtml } from "@/lib/html";

import {
  calculateBoxplotStatistics,
  toBoxplotTuple,
  type BoxplotStatistics,
} from "../utils/statistics";
import type { BiomarkerDistribution } from "../types";

export type BiomarkerChartOption = ComposeOption<
  | BoxplotSeriesOption
  | ScatterSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | AriaComponentOption
>;

export interface PreparedBiomarkerDistribution extends BiomarkerDistribution {
  readonly color: string;
  readonly stats: BoxplotStatistics;
}

const PALETTE = [
  "#2563eb",
  "#d97706",
  "#059669",
  "#9333ea",
  "#dc2626",
  "#0f766e",
  "#4f46e5",
  "#be185d",
];

export function prepareBiomarkerDistributions(
  distributions: readonly BiomarkerDistribution[],
  colors: Readonly<Record<string, string>> = {},
): PreparedBiomarkerDistribution[] {
  const cohorts = [...new Set(distributions.map((d) => d.cohort))].toSorted(
    (a, b) => a.localeCompare(b),
  );

  const prepared: PreparedBiomarkerDistribution[] = [];

  for (const distribution of distributions) {
    const stats = calculateBoxplotStatistics(distribution.values);
    if (!stats) continue;
    const index = cohorts.indexOf(distribution.cohort);

    prepared.push({
      ...distribution,
      color: colors[distribution.cohort] ?? PALETTE[index % PALETTE.length],
      stats,
    });
  }

  return prepared;
}

function formatTooltip(
  value: unknown,
  groups: readonly PreparedBiomarkerDistribution[],
): string {
  if (typeof value !== "object" || value === null) {
    return "";
  }

  if (
    !("seriesIndex" in value) ||
    !("dataIndex" in value) ||
    typeof value.seriesIndex !== "number" ||
    typeof value.dataIndex !== "number"
  ) {
    return "";
  }

  if (value.seriesIndex === 0) {
    const group = groups[value.dataIndex];
    if (!group) return "";
    const { stats } = group;

    return [
      `<strong>${escapeHtml(group.label)}</strong>`,
      `Participants: ${formatNumber(stats.n)}`,
      `Median: ${formatMeasurement(stats.median)}`,
      `Q1: ${formatMeasurement(stats.q1)}`,
      `Q3: ${formatMeasurement(stats.q3)}`,
      `Whiskers: ${formatMeasurement(stats.lowerWhisker)} - ${formatMeasurement(stats.upperWhisker)}`,
      `Mean: ${formatMeasurement(stats.mean)}`,
      `SD: ${formatMeasurement(stats.standardDeviation)}`,
      `Outliers: ${formatNumber(stats.outliers.length)}`,
    ].join("<br>");
  }

  if (!("value" in value) || !Array.isArray(value.value)) {
    return "";
  }

  const [index, measurement] = value.value;

  if (typeof index !== "number" || typeof measurement !== "number") {
    return "";
  }

  const group = groups[index];
  if (!group) return "";

  return [
    `<strong>${escapeHtml(group.label)}</strong>`,
    `Measurement: ${formatMeasurement(measurement)}`,
    "Outlier",
  ].join("<br>");
}

export function buildBiomarkerChartOptions(
  groups: readonly PreparedBiomarkerDistribution[],
  compact = false,
  title = "Biomarker distributions",
): BiomarkerChartOption {
  const boxplot: BoxplotSeriesOption = {
    type: "boxplot",
    name: "Distributions",
    data: groups.map((group) => ({
      name: group.label,
      value: toBoxplotTuple(group.stats),
      itemStyle: {
        color: group.color,
        borderColor: group.color,
        borderWidth: 2,
        opacity: 0.65,
      },
    })),
    z: 2,
  };

  const points: ScatterSeriesOption = {
    type: "scatter",
    name: "Outliers",
    data: groups.flatMap((group, index) =>
      group.stats.outliers.map((measurement) => ({
        name: group.label,
        value: [index, measurement],
        itemStyle: { color: group.color },
      })),
    ),
    symbolSize: 7,
    itemStyle: {
      opacity: 0.9,
    },
    z: 3,
  };

  return {
    animation: false,
    textStyle: {
      fontFamily: "Geist Variable, sans-serif",
      fontSize: 12,
    },
    backgroundColor: "#ffffff",

    aria: {
      enabled: true,
      label: {
        description:
          `${title}. Boxplots showing medians, quartiles, whiskers, ` +
          "and statistical outliers.",
      },
    },

    tooltip: {
      trigger: "item",
      confine: true,
      renderMode: "html",
      backgroundColor: "#ffffff",
      borderColor: "#dadce0",
      textStyle: {
        color: "#1a1a1a",
      },
      formatter: (params: unknown) => formatTooltip(params, groups),
    },

    grid: {
      left: compact ? 80 : 100,
      right: compact ? 20 : 32,
      top: 30,
      bottom: compact ? 90 : 110,
      outerBoundsContain: "all",
    },

    xAxis: {
      type: "category",
      data: groups.map((group) => group.label),
      jitter: 14,
      jitterOverlap: true,

      axisLabel: {
        show: true,
        interval: 0,
        rotate: compact ? 35 : 25,
        color: "#5f6368",
        formatter: (value: string) => {
          const limit = compact ? 16 : 22;

          return value.length > limit
            ? `${value.slice(0, limit - 3)}...`
            : value;
        },
      },
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: "#dadce0" } },
    },

    yAxis: {
      type: "value",
      scale: true,
      name: "Measurement value",
      nameLocation: "middle",
      nameGap: 48,
      nameTextStyle: {
        color: "#5f6368",
      },
      axisLabel: {
        color: "#5f6368",
      },
      splitLine: {
        lineStyle: { color: "#e5e7eb" },
      },
    },

    series: [boxplot, points],
  };
}
