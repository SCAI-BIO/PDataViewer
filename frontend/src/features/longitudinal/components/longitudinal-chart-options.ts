import type { LineSeriesOption } from "echarts/charts";
import type { ComposeOption } from "echarts/core";
import type {
  AriaComponentOption,
  GridComponentOption,
  LegendComponentOption,
  MarkLineComponentOption,
  TooltipComponentOption,
} from "echarts/components";

import { formatNumber } from "@/lib/formatters";
import type { RetentionSeries } from "../utils/retention";

export type LongitudinalChartOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | MarkLineComponentOption
  | TooltipComponentOption
  | AriaComponentOption
>;

const DEFAULT_COLORS = [
  "#2563eb",
  "#d97706",
  "#059669",
  "#9333ea",
  "#dc2626",
  "#0f766e",
  "#c2410c",
  "#4f46e5",
] as const;

const SYMBOLS = ["circle", "rect", "diamond", "triangle", "roundRect"] as const;

const LINE_STYLES = ["solid", "dashed", "dotted"] as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

interface TooltipPoint {
  seriesIndex: number;
  dataIndex: number;
}

function isTooltipPoint(value: unknown): value is TooltipPoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "seriesIndex" in value &&
    typeof value.seriesIndex === "number" &&
    "dataIndex" in value &&
    typeof value.dataIndex === "number"
  );
}

function formatTooltip(
  params: unknown,
  series: readonly RetentionSeries[],
): string {
  const items = (Array.isArray(params) ? params : [params]).filter(
    isTooltipPoint,
  );

  const rows = items.flatMap(({ seriesIndex, dataIndex }) => {
    const item = series[seriesIndex];
    const point = item?.points[dataIndex];

    if (!item || !point) return [];

    const percentage =
      point.retentionPercent === null
        ? "N/R"
        : `${point.retentionPercent.toFixed(1)}%`;

    return [
      `<div style="margin-bottom:6px">
        <strong>${escapeHtml(item.name)}</strong>
        <div>Month: ${point.months}</div>
        <div>Retention: ${percentage}</div>
        <div>Participants: ${formatNumber(point.patientCount)}
          / ${formatNumber(point.totalPatientCount)}</div>
      </div>`,
    ];
  });

  return rows.join("");
}

export function getSeriesColor(
  name: string,
  index: number,
  colors: Readonly<Record<string, string>>,
): string {
  return (
    colors[name] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? "#610030"
  );
}

export function buildLongitudinalChartOptions(
  series: readonly RetentionSeries[],
  colors: Readonly<Record<string, string>> = {},
  title = "Participant retention",
  compact = false,
): LongitudinalChartOption {
  const lineSeries: LineSeriesOption[] = series.map((item, index) => {
    const color = getSeriesColor(item.name, index, colors);

    return {
      type: "line",
      name: item.name,
      data: item.points.map((point) => [point.months, point.retentionPercent]),

      symbol: SYMBOLS[index % SYMBOLS.length],
      symbolSize: 7,
      showSymbol: true,

      // Scientific measurements should not be interpolated visually.
      smooth: false,
      connectNulls: false,

      lineStyle: {
        color,
        width: 2.5,
        type: LINE_STYLES[index % LINE_STYLES.length],
      },

      itemStyle: { color },

      emphasis: {
        focus: "series",
      },

      blur: {
        lineStyle: { opacity: 0.15 },
        itemStyle: { opacity: 0.25 },
      },

      // Draw the reference line only once.
      markLine:
        index === 0
          ? {
              silent: true,
              symbol: "none",
              lineStyle: {
                color: "#94a3b8",
                type: "dashed",
                width: 1,
              },
              label: {
                show: !compact,
                formatter: "50% retention",
                color: "#64748b",
                position: "insideEndTop",
              },
              data: [{ yAxis: 50 }],
            }
          : undefined,
    };
  });

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
        description: `${title}. Participant retention over months in study.`,
      },
    },

    tooltip: {
      trigger: compact ? "item" : "axis",
      confine: true,
      renderMode: "html",
      backgroundColor: "#ffffff",
      borderColor: "#dadce0",
      textStyle: {
        color: "#1a1a1a",
      },
      axisPointer: {
        type: "line",
      },
      formatter: (params: unknown) => formatTooltip(params, series),
    },

    legend: {
      show: !compact,
      type: "scroll",
      orient: "horizontal",
      left: 24,
      right: 24,
      bottom: 8,
      textStyle: {
        color: "#1a1a1a",
      },
    },

    grid: {
      left: compact ? 8 : 16,
      right: compact ? 8 : 20,
      top: compact ? 12 : 24,
      bottom: compact ? 55 : 90,
      containLabel: true,
    },

    xAxis: {
      type: "value",
      min: 0,
      name: compact ? "Months" : "Months in Study",
      nameLocation: "middle",
      nameGap: 28,
      splitNumber: compact ? 4 : 6,
      axisLabel: {
        color: "#5f6368",
      },
      splitLine: {
        show: false,
      },
    },

    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      interval: 20,
      name: compact ? "" : "Retention (%)",
      nameLocation: "middle",
      nameGap: 45,
      axisLabel: {
        formatter: "{value}%",
        color: "#5f6368",
      },
      splitLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
    },

    series: lineSeries,
  };
}
