import { Injectable } from '@angular/core';

import Plotly from 'plotly.js-dist-min';
import type { Config, Layout, PlotlyHTMLElement, ScatterData } from 'plotly.js-dist-min';

import type { LongitudinalData } from '@shared/interfaces/longitudinal-data';

// Line dash patterns to visually distinguish overlapping traces
const DASH_PATTERNS = ['solid', 'dash', 'dot', 'dashdot', 'longdash', 'longdashdot'] as const;

@Injectable({
  providedIn: 'root',
})
export class LineplotBuilder {
  async createLineplot(
    data: LongitudinalData[],
    colors: Record<string, string> = {},
    title: string,
    elementId: string,
  ): Promise<void> {
    // Group data by cohort
    const cohortEntries = Array.from(
      data.reduce((map, dataPoint) => {
        if (!map.has(dataPoint.cohort)) {
          map.set(dataPoint.cohort, []);
        }
        map.get(dataPoint.cohort)!.push(dataPoint);
        return map;
      }, new Map<string, LongitudinalData[]>()),
    );

    // Sort entries by cohort name for consistent legend order
    cohortEntries.sort(([a], [b]) => a.localeCompare(b));

    // Detect overlapping cohorts (same y-values at same x-values)
    const overlapGroups = this.detectOverlaps(cohortEntries);

    // Build traces
    const traces: ScatterData[] = cohortEntries.map(([cohort, values], index): ScatterData => {
      // Sort by months for clean line rendering
      values.sort((a, b) => a.months - b.months);

      const percentValues = values.map((dataPoint) =>
        dataPoint.totalPatientCount > 0
          ? (dataPoint.patientCount / dataPoint.totalPatientCount) * 100
          : 0,
      );

      // Determine dash pattern based on overlap group
      const dashIndex = overlapGroups.get(cohort) ?? 0;
      const dash = DASH_PATTERNS[dashIndex % DASH_PATTERNS.length] ?? 'solid';

      return {
        type: 'scatter',
        x: values.map((dataPoint) => dataPoint.months),
        y: percentValues,
        mode: 'lines+markers',
        name: cohort,
        line: {
          color: colors[cohort] || undefined,
          width: 2.5,
          shape: 'spline',
          smoothing: 0.8,
          dash,
        },
        marker: {
          size: 6,
          color: colors[cohort] || undefined,
          symbol: this.getMarkerSymbol(index),
          line: { color: '#ffffff', width: 1.5 },
        },
        opacity: 0.85,
        text: values.map((dataPoint, i) => {
          const percent = percentValues[i];
          const percentText =
            typeof percent === 'number' && isFinite(percent) ? `${percent.toFixed(1)}%` : 'N/A';
          return (
            `<b>${cohort}</b><br>` +
            `Month: ${dataPoint.months}<br>` +
            `Retention: ${percentText}<br>` +
            `Participants: ${dataPoint.patientCount} / ${dataPoint.totalPatientCount}`
          );
        }),
        hoverinfo: 'text',
        hoverlabel: {
          bgcolor: '#ffffff',
          bordercolor: colors[cohort] || '#610030',
          font: { size: 12, family: 'Roboto, sans-serif', color: '#1a1a1a' },
        },
      };
    });

    // Layout config
    const layout: Partial<Layout> = {
      title: {
        text: title,
        x: 0.5,
        font: {
          size: 16,
          family: 'Roboto, sans-serif',
          color: '#1a1a1a',
          weight: 600,
        },
      },
      xaxis: {
        title: {
          text: 'Months in Study',
          font: { size: 13, family: 'Roboto, sans-serif', color: '#5f6368' },
          standoff: 12,
        },
        dtick: 6,
        rangemode: 'tozero',
        gridcolor: 'rgba(0, 0, 0, 0.06)',
        gridwidth: 1,
        zeroline: false,
        linecolor: '#dadce0',
        linewidth: 1,
        tickfont: { size: 11, family: 'Roboto, sans-serif', color: '#5f6368' },
      },
      yaxis: {
        title: {
          text: 'Participant Retention (% of Baseline)',
          font: { size: 13, family: 'Roboto, sans-serif', color: '#5f6368' },
          standoff: 12,
        },
        range: [0, 105],
        rangemode: 'tozero',
        gridcolor: 'rgba(0, 0, 0, 0.06)',
        gridwidth: 1,
        zeroline: false,
        linecolor: '#dadce0',
        linewidth: 1,
        tickfont: { size: 11, family: 'Roboto, sans-serif', color: '#5f6368' },
        ticksuffix: '%',
      },
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.2,
        yanchor: 'top',
        font: { size: 12, family: 'Roboto, sans-serif', color: '#1a1a1a' },
        bgcolor: 'transparent',
        itemsizing: 'constant',
        itemwidth: 40,
      },
      autosize: true,
      margin: { t: 60, r: 24, b: 100, l: 80 },
      hovermode: 'closest',
      showlegend: true,
      plot_bgcolor: '#ffffff',
      paper_bgcolor: '#ffffff',
      shapes: [
        {
          type: 'line',
          x0: 0,
          x1: 1,
          xref: 'paper',
          y0: 50,
          y1: 50,
          yref: 'y',
          line: {
            color: 'rgba(0, 0, 0, 0.12)',
            width: 1,
            dash: 'dash',
          },
        },
      ],
      annotations: [
        {
          x: 1,
          xref: 'paper',
          xanchor: 'right',
          y: 50,
          yref: 'y',
          text: '50% retention',
          showarrow: false,
          font: { size: 10, color: 'rgba(0, 0, 0, 0.4)', family: 'Roboto, sans-serif' },
          yshift: 10,
        },
      ],
    };

    const config: Partial<Config> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: [
        'select2d',
        'lasso2d',
        'hoverClosestCartesian',
        'hoverCompareCartesian',
        'toggleSpikelines',
      ],
      toImageButtonOptions: {
        format: 'svg',
        filename: title.replace(/\s+/g, '_').toLowerCase(),
        scale: 2,
      },
    };

    // Clear and render
    const targetElement = document.getElementById(elementId);
    if (!targetElement) {
      const errorMessage = `LineplotBuilder: No DOM element found with id "${elementId}".`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const plotElement = await Plotly.newPlot(targetElement, traces, layout, config);
    this.attachHoverHighlight(plotElement, traces.length);
  }

  /**
   * Detects which cohorts have overlapping data points and assigns
   * each overlapping cohort a unique dash index within its group.
   */
  private detectOverlaps(cohortEntries: [string, LongitudinalData[]][]): Map<string, number> {
    const overlapMap = new Map<string, number>();
    const signatures = new Map<string, string[]>();

    // Create a "signature" for each cohort based on its (month, percent) pairs
    for (const [cohort, values] of cohortEntries) {
      const sorted = [...values].sort((a, b) => a.months - b.months);
      const sig = sorted
        .map((dp) => {
          const pct = (
            dp.totalPatientCount > 0 ? (dp.patientCount / dp.totalPatientCount) * 100 : 0
          ).toFixed(1);
          return `${dp.months}:${pct}`;
        })
        .join('|');

      if (!signatures.has(sig)) {
        signatures.set(sig, []);
      }
      signatures.get(sig)!.push(cohort);
    }

    // For groups with overlapping data, assign incremental dash indices
    for (const [, cohorts] of signatures) {
      if (cohorts.length > 1) {
        cohorts.forEach((cohort, index) => {
          overlapMap.set(cohort, index);
        });
      }
    }

    return overlapMap;
  }

  /**
   * Returns a distinct marker symbol for each trace index
   */
  private getMarkerSymbol(index: number) {
    const symbols = [
      'circle',
      'square',
      'diamond',
      'triangle-up',
      'triangle-down',
      'cross',
      'x',
      'star',
      'hexagon',
      'pentagon',
    ] as const;

    return symbols[index % symbols.length] ?? 'circle';
  }

  /**
   * Attaches hover listeners to highlight the active trace
   * and dim all others for better readability.
   */
  private attachHoverHighlight(plotElement: PlotlyHTMLElement, traceCount: number): void {
    const dimmedOpacity = 0.2;
    const activeOpacity = 1;
    const defaultOpacity = 0.85;

    plotElement.on('plotly_hover', (eventData) => {
      const hoveredTraceIndex = eventData.points[0]?.curveNumber;
      if (hoveredTraceIndex == null) return;

      for (let i = 0; i < traceCount; i++) {
        void Plotly.restyle(
          plotElement,
          {
            opacity: i === hoveredTraceIndex ? activeOpacity : dimmedOpacity,
          },
          [i],
        ).catch((error: unknown) => {
          console.error('LineplotBuilder: Hover highlight failed.', error);
        });
      }
    });

    plotElement.on('plotly_unhover', () => {
      void Plotly.restyle(plotElement, {
        opacity: defaultOpacity,
      }).catch((error: unknown) => {
        console.error('LineplotBuilder: Resetting opacity failed.', error);
      });
    });
  }
}
