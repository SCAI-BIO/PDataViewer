import { ElementRef, Injectable } from '@angular/core';
import * as d3 from 'd3';
import { LongitudinalData } from '../interfaces/longitudinal-data';

@Injectable({
  providedIn: 'root',
})
export class LineplotService {
  constructor() {}

  createLineplot(
    element: ElementRef,
    data: LongitudinalData[],
    colors: { [key: string]: string }
  ): void {
    const margin = { top: 20, right: 150, bottom: 60, left: 60 };
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

    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Set the domains for the scales
    x.domain(d3.extent(data, (d) => d.Months) as [number, number]);
    y.domain([0, 100]); // Y-axis from 0 to 100 percent

    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append('g').call(d3.axisLeft(y).ticks(10));

    const line = d3
      .line<LongitudinalData>()
      .x((d) => x(d.Months))
      .y((d) => y((d.PatientCount / d.TotalPatientCount) * 100));

    // Group data by cohort
    const cohorts = d3.group(data, (d) => d.Cohort);

    // Draw a line for each cohort
    cohorts.forEach((values, cohort) => {
      svg
        .append('path')
        .datum(values)
        .attr('class', 'line-path')
        .attr('fill', 'none')
        .attr('stroke', colors[cohort] || 'steelblue') // Use the color from the colors object
        .attr('stroke-width', 1.5)
        .attr('d', line);
    });

    // Add tooltip element
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('padding', '8px')
      .style('background', 'rgba(255, 255, 255, 0.9)')
      .style('border-radius', '4px')
      .style('border', '1px solid #ccc')
      .style('color', '#000')
      .style('visibility', 'hidden')
      .style('pointer-events', 'none');

    // Add vertical hover areas for tooltips
    const uniqueMonths = Array.from(new Set(data.map((d) => d.Months)));

    const verticalLine = svg
      .append('line')
      .attr('class', 'vertical-line')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', 'grey')
      .attr('stroke-width', 1)
      .attr('visibility', 'hidden');

    svg
      .selectAll('.hover-area')
      .data(uniqueMonths)
      .enter()
      .append('rect')
      .attr('class', 'hover-area')
      .attr('x', (d) => x(d) - width / uniqueMonths.length / 2)
      .attr('width', width / uniqueMonths.length)
      .attr('y', 0)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', (event, month) => {
        // Find all data points for the same month
        const monthData = data.filter((md) => md.Months === month);
        let tableContent = `
          <table style="border-collapse: collapse;">
            <tr>
              <th style="border: 1px solid #ccc; padding: 4px;">Cohort</th>
              <th style="border: 1px solid #ccc; padding: 4px;">Percentage</th>
            </tr>`;
        monthData.forEach((md) => {
          const percentage = (md.PatientCount / md.TotalPatientCount) * 100;
          tableContent += `
            <tr>
              <td style="border: 1px solid #ccc; padding: 4px;">
                <svg width="10" height="10">
                  <circle cx="5" cy="5" r="5" fill="${
                    colors[md.Cohort] || 'steelblue'
                  }"></circle>
                </svg>
                ${md.Cohort}
              </td>
              <td style="border: 1px solid #ccc; padding: 4px;">${percentage.toFixed(
                1
              )}% (${md.PatientCount} patients)</td>
            </tr>
          `;
        });
        tableContent += '</table>';

        tooltip.style('visibility', 'visible').html(`
            <strong>% of Participants at Month ${month}:</strong><br>
            ${tableContent}
          `);

        verticalLine
          .attr('x1', x(month))
          .attr('x2', x(month))
          .attr('visibility', 'visible');
      })
      .on('mousemove', (event) => {
        tooltip
          .style('top', `${event.pageY - 10}px`)
          .style('left', `${event.pageX + 10}px`);
      })
      .on('mouseout', () => {
        tooltip.style('visibility', 'hidden');
        verticalLine.attr('visibility', 'hidden');
      });

    // Add circles for data points
    data.forEach((d) => {
      svg
        .append('circle')
        .attr('cx', x(d.Months))
        .attr('cy', y((d.PatientCount / d.TotalPatientCount) * 100))
        .attr('r', 5)
        .attr('fill', colors[d.Cohort] || 'steelblue')
        .on('mouseover', (event) => {
          // Find all data points for the same month
          const monthData = data.filter((md) => md.Months === d.Months);
          let tableContent = `
            <table style="border-collapse: collapse;">
              <tr>
                <th style="border: 1px solid #ccc; padding: 4px;">Cohort</th>
                <th style="border: 1px solid #ccc; padding: 4px;">Percentage</th>
              </tr>`;
          monthData.forEach((md) => {
            const percentage = (md.PatientCount / md.TotalPatientCount) * 100;
            tableContent += `
              <tr>
                <td style="border: 1px solid #ccc; padding: 4px;">
                  <svg width="10" height="10">
                    <circle cx="5" cy="5" r="5" fill="${
                      colors[md.Cohort] || 'steelblue'
                    }"></circle>
                  </svg>
                  ${md.Cohort}
                </td>
                <td style="border: 1px solid #ccc; padding: 4px;">${percentage.toFixed(
                  1
                )}% (${md.PatientCount} patients)</td>
              </tr>
            `;
          });
          tableContent += '</table>';

          tooltip.style('visibility', 'visible').html(`
              <strong>% of Participants at Month ${d.Months}:</strong><br>
              ${tableContent}
            `);

          verticalLine
            .attr('x1', x(d.Months))
            .attr('x2', x(d.Months))
            .attr('visibility', 'visible');
        })
        .on('mousemove', (event) => {
          tooltip
            .style('top', `${event.pageY - 10}px`)
            .style('left', `${event.pageX + 10}px`);
        })
        .on('mouseout', () => {
          tooltip.style('visibility', 'hidden');
          verticalLine.attr('visibility', 'hidden');
        });
    });

    // Add legend
    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width + 20}, 0)`);

    let legendIndex = 0;
    cohorts.forEach((_, cohort) => {
      const legendRow = legend
        .append('g')
        .attr('transform', `translate(0, ${legendIndex * 20})`);

      legendRow
        .append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', colors[cohort] || 'steelblue');

      legendRow.append('text').attr('x', 15).attr('y', 10).text(cohort);

      legendIndex++;
    });

    // Add label for the y-axis
    svg
      .append('text')
      .attr('class', 'y axis-label')
      .attr('text-anchor', 'middle')
      .attr(
        'transform',
        `translate(${-margin.left / 1.5}, ${height / 2})rotate(-90)`
      )
      .text('Patients (% baseline patients)');

    // Add label for the x-axis
    svg
      .append('text')
      .attr('class', 'x axis-label')
      .attr('text-anchor', 'middle')
      .attr(
        'transform',
        `translate(${width / 2}, ${height + margin.bottom / 1.5})`
      )
      .text('Months');
  }
}
