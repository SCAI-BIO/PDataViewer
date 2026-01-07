import { Injectable } from '@angular/core';

import Plotly from 'plotly.js-dist-min';

@Injectable({
  providedIn: 'root',
})
export class BoxplotService {
  createBoxplot(
    data: Record<string, number[]>,
    title: string,
    colors: Record<string, string>,
    showDataPoints = false,
    ɵlementId: string
  ): void {
    // Transform input data
    const labels = Object.keys(data);
    const traces: Partial<Plotly.PlotData>[] = [];
    const cohortsSeen = new Set<string>();

    labels.forEach((label) => {
      const cohort = label.split(' (')[0];
      const diagnosisGroup = label.match(/\(([^)]+)\)/)?.[1].replace(' Group', '') || '';

      const values = (data[label] || []).filter((d): d is number => d !== undefined);

      const boxColor =
        Object.keys(colors).find((cohortName) => cohort.includes(cohortName)) !== undefined
          ? colors[Object.keys(colors).find((cohortName) => cohort.includes(cohortName))!]
          : '#69b3a2';

      // Box trace
      traces.push({
        y: values,
        type: 'box',
        name: cohort,
        x: Array(values.length).fill(`${cohort} (${diagnosisGroup} | n=${values.length})`),
        boxpoints: showDataPoints ? 'all' : 'outliers',
        jitter: showDataPoints ? 0.4 : 0, // jitter only if data points are shown
        pointpos: 0,
        marker: {
          color: boxColor,
          size: showDataPoints ? 6 : 4,
          line: { color: 'black', width: 1 },
        },
        line: { color: 'black' },
        fillcolor: boxColor,
        boxmean: false,
        legendgroup: cohort,
        showlegend: !cohortsSeen.has(cohort),
      });

      cohortsSeen.add(cohort);
    });

    const layout: Partial<Plotly.Layout> = {
      title: { text: title, x: 0.5 },
      yaxis: {
        title: {
          text: 'Values',
          font: { size: 14 },
        },
        zeroline: false,
      },
      xaxis: {
        title: {
          text: 'Diagnosis Groups',
          font: { size: 14 },
        },
      },
      margin: { t: 40, r: 150, b: 60, l: 60 },
      boxmode: 'group', // group cohorts side-by-side
      showlegend: true,
    };

    const config: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: true,
    };

    Plotly.newPlot(ɵlementId, traces, layout, config);
  }
}
