import { Injectable } from '@angular/core';

import Plotly from 'plotly.js-dist-min';

@Injectable({
  providedIn: 'root',
})
export class BoxplotBuilder {
  createBoxplot(
    data: Record<string, number[]>,
    title: string,
    colors: Record<string, string>,
    showDataPoints = false,
    elementId: string,
  ): void {
    const labels = Object.keys(data);
    const traces: Partial<Plotly.PlotData>[] = [];
    const cohortsSeen = new Set<string>();

    labels.forEach((label) => {
      const cohort = label.split(' (')[0];
      const diagnosisGroup = label.match(/\(([^)]+)\)/)?.[1].replace(' Group', '') || '';

      const values = (data[label] || []).filter((d): d is number => d !== undefined && isFinite(d));

      const colorKey = Object.keys(colors).find((cohortName) => cohort.includes(cohortName));
      const boxColor = colorKey ? colors[colorKey] : '#69b3a2';

      traces.push({
        y: values,
        type: 'box',
        name: cohort,
        x: Array(values.length).fill(`${cohort}<br>(${diagnosisGroup} | n=${values.length})`),
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

    const layout: Partial<Plotly.Layout> = {
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

    const config: Partial<Plotly.Config> = {
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
      const errorMessage = `BoxplotBuilder: No DOM element found with id "${elementId}".`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    Plotly.newPlot(elementId, traces, layout, config);

    // Hover highlight: dim other traces on hover
    this.attachHoverHighlight(targetElement, traces.length);
  }

  private attachHoverHighlight(plotElement: HTMLElement, traceCount: number): void {
    const dimmedOpacity = 0.3;
    const activeOpacity = 1;
    const defaultOpacity = 0.8;

    const plotlyEl = plotElement as unknown as Plotly.PlotlyHTMLElement;

    plotlyEl.on('plotly_hover', (eventData: Plotly.PlotHoverEvent) => {
      const hoveredTraceIndex = eventData.points[0]?.curveNumber;
      if (hoveredTraceIndex == null) return;

      for (let i = 0; i < traceCount; i++) {
        Plotly.restyle(
          plotElement,
          { opacity: i === hoveredTraceIndex ? activeOpacity : dimmedOpacity },
          [i],
        );
      }
    });

    plotlyEl.on('plotly_unhover', () => {
      for (let i = 0; i < traceCount; i++) {
        Plotly.restyle(plotElement, { opacity: defaultOpacity }, [i]);
      }
    });
  }
}
