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

    const x = d3.scaleLinear().range([0, width]);

    const y = d3.scaleLinear().range([height, 0]);

    svg.append('g').call(d3.axisLeft(y));

    const line = d3
      .line<any>()
      .x((d) => x(d.Months))
      .y((d) => y(d.PatientCount));

    svg
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 1.5)
      .attr('d', line);
  }
}
