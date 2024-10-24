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
    colors: { [key: string]: string }
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
    }[] = [];
    const labels = Object.keys(data);

    labels.forEach((label) => {
      const cohort = label.split(' (')[0]; // Get the cohort name
      const diagnosisGroup = label.match(/\(([^)]+)\)/)?.[1] || ''; // Extract the diagnosis group from parentheses (e.g., 'CU')
      const values = data[label]
        .filter((d): d is number => d !== undefined)
        .sort(d3.ascending);

      allData.push({ cohort, diagnosisGroup, values });
    });

    // Create x scale with unique keys for each position
    const x = d3
      .scaleBand()
      .range([0, width])
      .domain(allData.map((d, i) => `${d.diagnosisGroup}-${i}`)) // Unique key for each position
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([
        d3.min(allData, (d) => d3.min(d.values) as number) as number,
        d3.max(allData, (d) => d3.max(d.values) as number) as number,
      ] as [number, number])
      .nice()
      .range([height, 0]);

    // Create the x-axis with custom ticks to show only the diagnosis group code
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3.axisBottom(x).tickFormat((d) => {
          const diagnosisGroup = d.split('-')[0]; // Extract only the diagnosis group code
          return diagnosisGroup.replace(/ Group$/, ''); // Remove " Group" if it exists
        })
      );

    svg.append('g').call(d3.axisLeft(y));

    const boxWidth = x.bandwidth() * 0.5;

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

      // Determine the color based on the cohort name, keeping original logic
      let boxColor = '#69b3a2'; // Default color
      for (const key in colors) {
        if (d.cohort.includes(key)) {
          // Check if the cohort matches the color key
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
    });

    // Create the legend
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
  }
}
