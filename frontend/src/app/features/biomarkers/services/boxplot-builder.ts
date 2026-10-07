import { Injectable } from '@angular/core';

import Plotly from 'plotly.js-dist-min';
import type { BoxData, Config, Layout, PlotlyHTMLElement } from 'plotly.js-dist-min';
import {
  createResponsivePlot,
  plotLegendHeight,
  wrapPlotText,
} from '@shared/utils/responsive-plot';

@Injectable({
  providedIn: 'root',
})
export class BoxplotBuilder {
  async createBoxplot(
    data: Record<string, number[]>,
    title: string,
    colors: Record<string, string>,
    showDataPoints = false,
    elementId: string,
  ): Promise<void> {
    const targetElement = document.getElementById(elementId);

    if (!targetElement) {
      throw new Error(`BoxplotBuilder: No DOM element found with id "${elementId}".`);
    }

    const labels = Object.keys(data);
    const traces: BoxData[] = [];
    const cohortsSeen = new Set<string>();

    labels.forEach((label) => {
      const cohort = label.split(' (')[0] ?? label;
      const diagnosisGroup = label.match(/\(([^)]+)\)/)?.[1].replace(' Group', '') ?? '';
      const values = (data[label] ?? []).filter(Number.isFinite);
      const colorKey = Object.keys(colors).find((cohortName) => cohort.includes(cohortName));
      const boxColor = (colorKey !== undefined ? colors[colorKey] : undefined) ?? '#69b3a2';
      const categoryLabel = `${wrapPlotText(cohort, 16)}<br>${wrapPlotText(diagnosisGroup, 16)}<br>n=${values.length}`;

      traces.push({
        type: 'box',
        y: values,
        x: values.map(() => categoryLabel),
        name: wrapPlotText(cohort, 24),
        boxpoints: showDataPoints ? 'all' : 'outliers',
        jitter: showDataPoints ? 0.5 : 0.3,
        pointpos: showDataPoints ? -1.5 : 0,
        marker: {
          color: boxColor,
          size: showDataPoints ? 4 : 3,
          opacity: showDataPoints ? 0.5 : 0.8,
          line: { color: 'rgba(0, 0, 0, 0.3)', width: 0.5 },
        },
        line: { color: 'rgba(0, 0, 0, 0.6)', width: 1.5 },
        fillcolor: boxColor,
        opacity: 0.8,
        boxmean: 'sd',
        legendgroup: cohort,
        showlegend: !cohortsSeen.has(cohort),
        hoverinfo: 'y+name',
        hoverlabel: {
          bgcolor: '#ffffff',
          bordercolor: boxColor,
          font: { size: 12, family: 'Roboto, sans-serif', color: '#1a1a1a' },
        },
      });

      cohortsSeen.add(cohort);
    });

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
      yaxis: {
        automargin: true,
        title: {
          text: 'Values',
          font: { size: 13, family: 'Roboto, sans-serif', color: '#5f6368' },
          standoff: 12,
        },
        gridcolor: 'rgba(0, 0, 0, 0.06)',
        gridwidth: 1,
        zeroline: false,
        linecolor: '#dadce0',
        linewidth: 1,
        tickfont: { size: 11, family: 'Roboto, sans-serif', color: '#5f6368' },
      },
      xaxis: {
        automargin: true,
        title: {
          text: 'Cohort (Diagnosis Group)',
          font: { size: 13, family: 'Roboto, sans-serif', color: '#5f6368' },
          standoff: 16,
        },
        tickfont: { size: 11, family: 'Roboto, sans-serif', color: '#5f6368' },
        tickangle: labels.length > 6 ? -30 : 0,
        linecolor: '#dadce0',
        linewidth: 1,
      },
      autosize: true,
      margin: { t: 60, r: 24, b: labels.length > 6 ? 120 : 80, l: 80 },
      boxmode: 'group',
      showlegend: true,
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.3,
        yanchor: 'top',
        font: { size: 12, family: 'Roboto, sans-serif', color: '#1a1a1a' },
        bgcolor: 'transparent',
        itemsizing: 'constant',
      },
      plot_bgcolor: '#ffffff',
      paper_bgcolor: '#ffffff',
      hovermode: 'closest',
    };

    const config: Partial<Config> = {
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

    const plotElement = await createResponsivePlot(
      targetElement,
      traces,
      layout,
      config,
      (width, compact, availableWidth) => {
        const titleText = wrapPlotText(title, Math.max(20, Math.floor((availableWidth - 32) / 8)));
        const top = titleText.split('<br>').length * 20 + 48;
        const labelLines = Math.max(
          1,
          ...traces.map((trace) => String(trace.x?.[0] ?? '').split('<br>').length),
        );
        const bottom =
          plotLegendHeight([...cohortsSeen], width - 100, compact) + labelLines * 15 + 55;
        return {
          height: Math.max(450, (compact ? 280 : 340) + top + bottom),
          margin: { t: top, r: compact ? 12 : 24, b: bottom, l: compact ? 52 : 80 },
          'title.text': titleText,
          'title.xref': 'container',
          'title.x': availableWidth / (2 * width),
          'title.xanchor': 'center',
          'title.font.size': compact ? 14 : 16,
          'title.y': 1,
          'title.yanchor': 'top',
          'title.pad.t': 36,
          'xaxis.tickangle': 0,
          'xaxis.title.text': compact ? '' : 'Cohort (Diagnosis Group)',
          'legend.orientation': compact ? 'v' : 'h',
          'legend.x': compact ? 0 : 0.5,
          'legend.xanchor': compact ? 'left' : 'center',
          'legend.yref': 'container',
          'legend.y': 0,
          'legend.yanchor': 'bottom',
        };
      },
      labels.length > 1 ? labels.length * 125 + 90 : 0,
    );
    if (plotElement) this.attachHoverHighlight(plotElement, traces.length);
  }

  private attachHoverHighlight(plotElement: PlotlyHTMLElement, traceCount: number): void {
    const dimmedOpacity = 0.3;
    const activeOpacity = 1;
    const defaultOpacity = 0.8;

    plotElement.on('plotly_hover', (eventData) => {
      const hoveredTraceIndex = eventData.points[0]?.curveNumber;
      if (hoveredTraceIndex == null) return;

      for (let i = 0; i < traceCount; i++) {
        void Plotly.restyle(
          plotElement,
          { opacity: i === hoveredTraceIndex ? activeOpacity : dimmedOpacity },
          [i],
        ).catch((error: unknown) => {
          console.error('BoxplotBuilder: Hover highlight failed.', error);
        });
      }
    });

    plotElement.on('plotly_unhover', () => {
      void Plotly.restyle(plotElement, { opacity: defaultOpacity }).catch((error: unknown) => {
        console.error('BoxplotBuilder: Resetting opacity failed.', error);
      });
    });
  }
}
