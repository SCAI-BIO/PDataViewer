import { Injectable } from '@angular/core';

import Plotly from 'plotly.js-dist-min';

import { LongitudinalData } from '../interfaces/longitudinal-data';

@Injectable({
  providedIn: 'root',
})
export class LineplotService {
  createLineplot(
    data: LongitudinalData[],
    colors: Record<string, string> = {},
    title: string,
    elementId: string,
  ): void {
    // group data by cohort
    const cohortEntries = Array.from(
      data.reduce((map, dataPoint) => {
        if (!map.has(dataPoint.cohort)) {
          map.set(dataPoint.cohort, []);
        }
        map.get(dataPoint.cohort)!.push(dataPoint);
        return map;
      }, new Map<string, LongitudinalData[]>()),
    );

    // build traces
    const traces = cohortEntries.map(([cohort, values]) => {
      const percentValues = values.map((dataPoint) =>
        dataPoint.totalPatientCount > 0
          ? (dataPoint.patientCount / dataPoint.totalPatientCount) * 100
          : 0,
      );
      return {
        x: values.map((dataPoint) => dataPoint.months),
        y: percentValues,
        mode: 'lines+markers',
        name: cohort,
        line: { color: colors[cohort] || undefined, width: 2 },
        marker: { size: 6, color: colors[cohort] || undefined },
        text: values.map((dataPoint, index) => {
          const percent = percentValues[index];
          const percentText =
            typeof percent === 'number' && isFinite(percent) ? `${percent.toFixed(1)}%` : 'N/A';
          return `${cohort}<br>${percentText} (${dataPoint.patientCount}/${dataPoint.totalPatientCount})`;
        }),
        hoverinfo: 'text+x',
      };
    });

    // layout config
    const layout: Partial<Plotly.Layout> = {
      title: { text: title, x: 0.5 },
      xaxis: {
        title: {
          text: 'Months',
          font: { size: 14 },
        },
        dtick: 6, // ticks every 6 months
      },
      yaxis: {
        title: {
          text: 'Participants (% baseline participants)',
          font: { size: 14 },
        },
        range: [0, 100],
      },
      legend: { orientation: 'v', x: 1.05, y: 1 },
      margin: { t: 50, r: 200, b: 60, l: 80 },
      hovermode: 'x unified',
      showlegend: true,
    };

    const config: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: true,
    };

    // clear and render
    const targetElement = document.getElementById(elementId);
    if (!targetElement) {
      const errorMessage = `LineplotService: No DOM element found with id "${elementId}". Plot will not be rendered.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    Plotly.newPlot(elementId, traces, layout, config);
  }
}
