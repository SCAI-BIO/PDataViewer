import { Injectable, ElementRef } from '@angular/core';
import * as d3 from 'd3';

@Injectable({
  providedIn: 'root',
})
export class BoxplotService {
  constructor() {}

  createBoxplot(
    element: ElementRef,
    data: { [key: string]: number[] },
    colors: { [key: string]: string },
    showDataPoints: boolean = false
  ): void {
    const margin = { top: 20, right: 150, bottom: 40, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select(element.nativeElement).selectAll('*').remove();

    const svg = d3
      .select(element.nativeElement)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const allData: {
      cohort: string;
      diagnosisGroup: string;
      values: number[];
      participantCount: number;
    }[] = [];
    const labels = Object.keys(data);

    labels.forEach((label) => {
      const cohort = label.split(' (')[0]; // Get the cohort name
      const diagnosisGroup =
        label.match(/\(([^)]+)\)/)?.[1].replace(' Group', '') || ''; // Extract the diagnosis group from parentheses (e.g., CU)
      const values = data[label]
        .filter((d): d is number => d !== undefined)
        .sort(d3.ascending);
      const participantCount = values.length;

      allData.push({ cohort, diagnosisGroup, values, participantCount });
    });

    const x = d3
      .scaleBand()
      .range([0, width])
      .domain(allData.map((d, i) => `${d.diagnosisGroup}-${i}`))
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(allData, (d) => d3.max(d.values) as number) as number,
      ] as [number, number])
      .nice()
      .range([height, 0]);

    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3.axisBottom(x).tickFormat((d) => {
          const index = parseInt(d.split('-')[1], 10);
          const diagnosisGroup = d.split('-')[0];
          const participantCount = allData[index]?.participantCount || 0;
          return `${diagnosisGroup} | n=${participantCount}`;
        })
      );

    svg.append('g').call(d3.axisLeft(y));

    const colorMap: { [key: string]: string } = {
      CU: '#32cd32',
      PD: '#ff0000',
      Complete: '#008080',
    };

    const boxWidth = x.bandwidth() * 0.5;
    const jitterAmount = boxWidth / 1.5;

    allData.forEach((d, i) => {
      const q1 = d3.quantile(d.values, 0.25) as number;
      const median = d3.quantile(d.values, 0.5) as number;
      const q3 = d3.quantile(d.values, 0.75) as number;
      const interQuantileRange = q3 - q1;
      const min = Math.max(
        d3.min(d.values) as number,
        q1 - 1.5 * interQuantileRange
      );
      const max = Math.min(
        d3.max(d.values) as number,
        q3 + 1.5 * interQuantileRange
      );

      let boxColor = '#69b3a2';
      for (const key in colors) {
        if (d.cohort.includes(key)) {
          boxColor = colors[key];
          break;
        }
      }

      if (x(`${d.diagnosisGroup}-${i}`) !== undefined) {
        svg
          .append('line')
          .attr('x1', x(`${d.diagnosisGroup}-${i}`)! + x.bandwidth() / 2)
          .attr('x2', x(`${d.diagnosisGroup}-${i}`)! + x.bandwidth() / 2)
          .attr('y1', y(min))
          .attr('y2', y(max))
          .attr('stroke', 'black');

        svg
          .append('rect')
          .attr(
            'x',
            x(`${d.diagnosisGroup}-${i}`)! + (x.bandwidth() - boxWidth) / 2
          )
          .attr('y', y(q3))
          .attr('height', y(q1) - y(q3))
          .attr('width', boxWidth)
          .attr('stroke', 'black')
          .style('fill', boxColor);

        svg
          .append('line')
          .attr(
            'x1',
            x(`${d.diagnosisGroup}-${i}`)! + (x.bandwidth() - boxWidth) / 2
          )
          .attr(
            'x2',
            x(`${d.diagnosisGroup}-${i}`)! + (x.bandwidth() + boxWidth) / 2
          )
          .attr('y1', y(median))
          .attr('y2', y(median))
          .attr('stroke', 'black');

        svg
          .append('line')
          .attr(
            'x1',
            x(`${d.diagnosisGroup}-${i}`)! + (x.bandwidth() - boxWidth) / 2
          )
          .attr(
            'x2',
            x(`${d.diagnosisGroup}-${i}`)! + (x.bandwidth() + boxWidth) / 2
          )
          .attr('y1', y(min))
          .attr('y2', y(min))
          .attr('stroke', 'black');

        svg
          .append('line')
          .attr(
            'x1',
            x(`${d.diagnosisGroup}-${i}`)! + (x.bandwidth() - boxWidth) / 2
          )
          .attr(
            'x2',
            x(`${d.diagnosisGroup}-${i}`)! + (x.bandwidth() + boxWidth) / 2
          )
          .attr('y1', y(max))
          .attr('y2', y(max))
          .attr('stroke', 'black');
      }
      if (showDataPoints) {
        svg
          .selectAll(`.data-point-${i}`)
          .data(d.values)
          .enter()
          .append('circle')
          .attr('class', `data-point-${i}`)
          .attr('cx', () => {
            const baseX = x(`${d.diagnosisGroup}-${i}`)! + x.bandwidth() / 2;
            const jitterX = Math.random() * jitterAmount - jitterAmount / 2;
            return baseX + jitterX;
          })
          .attr('cy', (value) => y(value))
          .attr('r', 4)
          .style('fill', colorMap[d.diagnosisGroup] || 'gray')
          .style('fill-opacity', 0.5)
          .style('stroke', 'black')
          .style('stroke-width', 1);
      }
    });

    // Create the legend for cohorts
    const legend = svg
      .append('g')
      .attr('transform', `translate(${width + 20}, 0)`);

    const usedCohorts = Array.from(
      new Set(
        labels
          .map((label) => {
            const cohort = Object.keys(colors).find((cohortName) =>
              label.includes(cohortName)
            );
            return cohort ? cohort : '';
          })
          .filter((cohort) => cohort !== '')
      )
    );

    legend
      .selectAll('rect')
      .data(usedCohorts)
      .enter()
      .append('rect')
      .attr('class', 'legend-item')
      .attr('x', 0)
      .attr('y', (d, i) => i * 20)
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', (d) => colors[d]);

    legend
      .selectAll('text')
      .data(usedCohorts)
      .enter()
      .append('text')
      .attr('class', 'legend-item')
      .attr('x', 24)
      .attr('y', (d, i) => i * 20 + 9)
      .attr('dy', '0.35em')
      .text((d) => d);

    if (showDataPoints) {
      const usedDiagnosisGroups = Array.from(new Set(allData.map(d => d.diagnosisGroup)));
      const diagnosisLegend = svg
        .append('g')
        .attr(
          'transform',
          `translate(${width + 20}, ${usedCohorts.length * 20 + 20})`
        );

      diagnosisLegend
        .selectAll('circle')
        .data(usedDiagnosisGroups)
        .enter()
        .append('circle')
        .attr('cx', 9)
        .attr('cy', (d, i) => i * 20)
        .attr('r', 9)
        .style('fill', (d) => colorMap[d]);

      diagnosisLegend
        .selectAll('text.diagnosis-legend')
        .data(usedDiagnosisGroups)
        .enter()
        .append('text')
        .attr('class', 'diagnosis-legend')
        .attr('x', 24)
        .attr('y', (d, i) => i * 20 + 5) // Adjust text position
        .text((d) => d);
    }
  }
}
