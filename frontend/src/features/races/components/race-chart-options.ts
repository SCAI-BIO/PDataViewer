import type { PieSeriesOption } from "echarts/charts";
import type { ComposeOption } from "echarts/core";
import type {
  AriaComponentOption,
  TooltipComponentOption,
} from "echarts/components";

import { formatNumber } from "@/lib/formatters";
import { escapeHtml } from "@/lib/html";

import type { RaceDistributionData } from "../types";

export type RaceChartOption = ComposeOption<
  PieSeriesOption | TooltipComponentOption | AriaComponentOption
>;

const COLORS: Readonly<Record<string, string>> = {
  White: "#610030",
  Asian: "#2563eb",
  "Black or African American": "#059669",
  "Native Hawaiian or Other Pacific Islander": "#d97706",
  "American Indian or Alaska Native": "#7c3aed",
};

const EXTRA_COLORS = [
  "#be123c",
  "#0f766e",
  "#9a3412",
  "#4338ca",
  "#a21caf",
  "#0369a1",
] as const;

export function getRaceColor(name: string): string {
  if (COLORS[name]) return COLORS[name];
  let hash = 0;
  for (const character of name)
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return EXTRA_COLORS[hash % EXTRA_COLORS.length] ?? "#610030";
}

export function getTotalSelections(
  rows: readonly RaceDistributionData[],
): number {
  return rows.reduce((total, row) => total + row.value, 0);
}

function formatTooltip(
  params: unknown,
  data: readonly RaceDistributionData[],
  total: number,
): string {
  if (
    typeof params !== "object" ||
    params === null ||
    !("dataIndex" in params) ||
    typeof params.dataIndex !== "number"
  )
    return "";

  const row = data[params.dataIndex];
  if (!row) return "";
  const percent = total === 0 ? 0 : (row.value / total) * 100;

  return [
    `<strong>${escapeHtml(row.name)}</strong>`,
    `<div>${formatNumber(row.value)} selections</div>`,
    `<div>${percent.toFixed(1)}% of recorded selections</div>`,
  ].join("");
}

export function buildRaceChartOptions(
  rows: readonly RaceDistributionData[],
): RaceChartOption {
  const data = rows.filter((row) => row.value > 0);
  const total = getTotalSelections(data);
  return {
    animation: false,
    backgroundColor: "#ffffff",
    textStyle: { fontFamily: "Geist Variable, sans-serif", fontSize: 12 },
    aria: {
      enabled: true,
      label: {
        description: `Pie chart with ${formatNumber(total)} recorded race selections. Participants may select multiple categories.`,
      },
    },
    tooltip: {
      trigger: "item",
      confine: true,
      renderMode: "html",
      backgroundColor: "#ffffff",
      borderColor: "#dadce0",
      textStyle: { color: "#1a1a1a" },
      formatter: (params: unknown) => formatTooltip(params, data, total),
    },
    series: [
      {
        name: "Race selections",
        type: "pie",
        radius: ["50%", "73%"],
        center: ["50%", "50%"],

        // Spacing between slices (degrees).
        minAngle: 2,
        padAngle: 0.5,

        // Rounded corners and subtle separation.
        itemStyle: {
          borderRadius: 2,
          borderColor: "#ffffff",
          borderWidth: 0,
        },

        stillShowZeroSum: false,
        label: { show: false },
        labelLine: { show: false },

        emphasis: {
          scale: true,
          scaleSize: 5,
        },

        data: data.map((row) => ({
          name: row.name,
          value: row.value,
          itemStyle: { color: getRaceColor(row.name) },
        })),
      },
    ],
  };
}
