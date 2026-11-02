import type { EChartsType } from "echarts/core";

export function downloadChartSvg(
  chart: EChartsType | null,
  title: string,
): void {
  if (!chart || chart.isDisposed()) return;

  const filename =
    title
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100)
      .replace(/-+$/g, "") || "chart";

  const dataUrl = chart.getDataURL({
    type: "svg",
    backgroundColor: "#ffffff",
  });

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${filename}.svg`;

  document.body.appendChild(link);
  link.click();
  link.remove();
}
