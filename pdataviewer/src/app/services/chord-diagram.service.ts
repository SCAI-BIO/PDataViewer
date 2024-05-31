import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Node } from '../interfaces/node';
import { Link } from '../interfaces/link';

@Injectable({
  providedIn: 'root',
})
export class ChordDiagramService {
  // Chunk the data into smaller parts for easier processing
  chunkData(data: any, chunkSize: number): any[] {
    const chunks = [];
    for (let i = 0; i < data.nodes.length; i += chunkSize) {
      chunks.push({
        nodes: data.nodes.slice(i, i + chunkSize),
        links: data.links.filter((link: any) =>
          data.nodes
            .slice(i, i + chunkSize)
            .some(
              (node: any) =>
                node.name === link.source || node.name === link.target
            )
        ),
      });
    }
    return chunks;
  }

  // Create chord diagrams for each chunk of data
  createChordDiagrams(dataChunks: any[]): void {
    dataChunks.forEach((chunk, index) => {
      setTimeout(() => this.createChordDiagram(chunk, index), 0);
    });
  }

  // Create a single chord diagram for a given chunk of data
  private createChordDiagram(data: any, index: number): void {
    const svgElement = d3.selectAll('.chord-diagram').nodes()[index];
    const svg = d3.select(svgElement).select('svg');
    svg.selectAll('*').remove();

    const width = 600;
    const height = 600;
    const outerRadius = Math.min(width, height) * 0.5 - 60;
    const innerRadius = outerRadius - 30;

    let nodes: Node[] = data.nodes.map((node: Node) => ({
      ...node,
      id: `${node.name}_${node.group}`,
    }));
    const links: Link[] = data.links;

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    nodes = nodes.sort((a, b) => a.group.localeCompare(b.group));

    const nodeIndex = new Map(
      nodes.map((node: Node, i: number) => [node.id, i])
    );
    const cohorts = Array.from(new Set(nodes.map((node) => node.group)));

    const matrix = Array(nodes.length)
      .fill(0)
      .map(() => Array(nodes.length).fill(0));

    links.forEach((link: Link) => {
      const sourceNodes = nodes.filter(
        (node: Node) => node.name === link.source
      );
      const targetNodes = nodes.filter(
        (node: Node) => node.name === link.target
      );

      sourceNodes.forEach((sourceNode) => {
        targetNodes.forEach((targetNode) => {
          if (sourceNode.group !== targetNode.group) {
            const sourceIndex = nodeIndex.get(sourceNode.id!);
            const targetIndex = nodeIndex.get(targetNode.id!);
            if (sourceIndex !== undefined && targetIndex !== undefined) {
              matrix[sourceIndex][targetIndex] = 1;
              matrix[targetIndex][sourceIndex] = 1;
            }
          }
        });
      });
    });

    const chord = d3.chord().padAngle(0.06).sortSubgroups(d3.descending);
    const chords = chord(matrix);

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    const ribbon = d3.ribbon().radius(innerRadius);

    const svgGroup = svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + 200} ${height + 200}`)
      .append('g')
      .attr(
        'transform',
        `translate(${(width + 200) / 2},${(height + 200) / 2})`
      );

    const group = svgGroup
      .append('g')
      .selectAll('g')
      .data(chords.groups)
      .enter()
      .append('g');

    group
      .append('path')
      .style('fill', (d: any) => {
        const feature = nodes[d.index];
        return color(feature.group);
      })
      .style('stroke', (d: any) => {
        const feature = nodes[d.index];
        return d3.rgb(color(feature.group)).darker().toString();
      })
      .attr('d', arc as unknown as (d: any) => string);

    const texts = group
      .append('text')
      .each((d: any) => {
        d.angle = (d.startAngle + d.endAngle) / 2;
      })
      .attr('dy', '.35em')
      .attr(
        'transform',
        (d: any) => `
                rotate(${(d.angle * 180) / Math.PI - 90})
                translate(${outerRadius + 20})
                ${d.angle > Math.PI ? 'rotate(180)' : ''}
            `
      )
      .style('text-anchor', (d: any) => (d.angle > Math.PI ? 'end' : null))
      .text((d: any) => nodes[d.index].name)
      .on('mouseover', function (event: any, d: any) {
        const index = d.index;
        svgGroup
          .selectAll('.ribbon')
          .filter(
            (r: any) => r.source.index === index || r.target.index === index
          )
          .style('fill', 'black')
          .style('stroke', 'black');
      })
      .on('mouseout', () => {
        svgGroup
          .selectAll('.ribbon')
          .style('fill', 'skyblue')
          .style('stroke', 'skyblue');
      });

    svgGroup
      .append('g')
      .attr('fill-opacity', 0.75)
      .attr('stroke-opacity', 0.75)
      .attr('cursor', 'pointer')
      .selectAll('path')
      .data(chords)
      .enter()
      .append('path')
      .attr('class', 'ribbon')
      .attr('d', ribbon as unknown as (d: any) => string);

    // Add legend
    const legend = d3.select(svgElement).append('div').attr('class', 'legend');

    cohorts.forEach((cohort) => {
      const legendRow = legend.append('div').attr('class', 'legend-row');

      legendRow
        .append('div')
        .attr('class', 'legend-color')
        .style('background-color', color(cohort));

      legendRow.append('div').attr('class', 'legend-text').text(cohort);
    });
  }
}
