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
    elementId: string
  ): void {
    // group data by cohort
    const cohorts = Array.from(
      data.reduce((map, d) => {
        if (!map.has(d.Cohort)) {
          map.set(d.Cohort, []);
        }
        map.get(d.Cohort)!.push(d);
        return map;
      }, new Map<string, LongitudinalData[]>())
    );

    // build traces
    const traces = cohorts.map(([cohort, values]) => {
      return {
        x: values.map((v) => v.Months),
        y: values.map((v) => (v.PatientCount / v.TotalPatientCount) * 100),
        mode: 'lines+markers',
        name: cohort,
        line: { color: colors[cohort] || undefined, width: 2 },
        marker: { size: 6, color: colors[cohort] || undefined },
        text: values.map(
          (v) =>
            `${cohort}<br>${(
              (v.PatientCount / v.TotalPatientCount) *
              100
            ).toFixed(1)}% (${v.PatientCount}/${v.TotalPatientCount})`
        ),
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
    };

    const config: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: true,
    };

    // clear and render
    Plotly.newPlot(elementId, traces, layout, config);
  }
}
