import { useEffect, useRef } from "react";
import { init, type EChartsCoreOption, type EChartsType } from "echarts/core";

interface UseEChartsOptions {
  enabled?: boolean;
}

export function useECharts(
  options: EChartsCoreOption,
  { enabled = true }: UseEChartsOptions = {},
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  // Initialize the chart and manage its lifecycle.
  useEffect(() => {
    const container = containerRef.current;

    if (!enabled || !container) return undefined;

    const chart = init(container, undefined, {
      renderer: "svg",
    });

    chartRef.current = chart;

    let frame: number | null = null;

    const observer = new ResizeObserver(() => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        frame = null;

        if (!chart.isDisposed()) {
          chart.resize();
        }
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();

      if (frame !== null) {
        cancelAnimationFrame(frame);
      }

      if (chartRef.current === chart) {
        chartRef.current = null;
      }

      chart.dispose();
    };
  }, [enabled]);

  // Update options without recreating the chart instance.
  useEffect(() => {
    if (!enabled) return;

    chartRef.current?.setOption(options, {
      notMerge: true,
    });
  }, [options, enabled]);

  return {
    containerRef,
    chartRef,
  };
}
