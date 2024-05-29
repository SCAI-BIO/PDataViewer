import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { NavBarComponent } from '../nav-bar/nav-bar.component';
import { environment } from '../../environments/environment';

// Interface to represent a node (feature)
interface Node {
  name: string;
  group: string;
  id?: string;
}

// Interface to represent a link (connection between features)
interface Link {
  source: string;
  target: string;
}

@Component({
  selector: 'app-mappings',
  standalone: true,
  imports: [NavBarComponent, CommonModule],
  templateUrl: './mappings.component.html',
  styleUrls: ['./mappings.component.css'],
})
export class MappingsComponent implements OnInit, OnDestroy {
  private API_URL = environment.API_URL;
  private cohorts: string[] = [];
  private data: any;
  private modality: string = '';
  private subscriptions: Subscription[] = [];
  public modalities: string[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchModalities();
    this.fetchCohorts();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onModalityClick(modality: string): void {
    this.modality = modality;
    this.fetchData();
  }

  private fetchModalities(): void {
    const sub = this.http
      .get<string[]>(`${this.API_URL}/cdm/modalities`)
      .subscribe({
        next: (v) => {
          this.modalities = v;
        },
        error: (e) => console.error('Error fetching the modalities:', e),
        complete: () => console.info('Modalities fetched successfully.'),
      });
    this.subscriptions.push(sub);
  }

  private fetchCohorts(): void {
    const sub = this.http
      .get<string[]>(`${this.API_URL}/cdm/cohorts`)
      .subscribe({
        next: (v) => {
          this.cohorts = v;
        },
        error: (e) => console.error('Error fetching cohorts:', e),
        complete: () => console.info('Cohorts fetched successfully.'),
      });
    this.subscriptions.push(sub);
  }

  private fetchData(): void {
    const request = {
      cohorts: this.cohorts,
      modality: this.modality,
    };
    const sub = this.http
      .post<any>(`${this.API_URL}/visualization/chords/`, request)
      .subscribe({
        next: (v) => {
          this.data = v;
          this.createChordDiagram();
        },
        error: (e) => console.error('Error fetching chord data:', e),
        complete: () =>
          console.info('Chord diagram data fetched successfully.'),
      });
    this.subscriptions.push(sub);
  }

  private createChordDiagram(): void {
    const svgElement = d3.select('svg');
    svgElement.selectAll('*').remove(); // Clear previous diagram

    const width = 600;
    const height = 600;
    const outerRadius = Math.min(width, height) * 0.5 - 60;
    const innerRadius = outerRadius - 30;

    let nodes: Node[] = this.data.nodes.map((node: Node) => ({
      ...node,
      id: `${node.name}_${node.group}`, // Create a unique identifier
    }));
    const links: Link[] = this.data.links;

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

    const chord = d3.chord().padAngle(0.03).sortSubgroups(d3.descending);
    const chords = chord(matrix);

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    const ribbon = d3.ribbon().radius(innerRadius);

    const svg = svgElement
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + 200} ${height + 200}`)
      .append('g')
      .attr(
        'transform',
        `translate(${(width + 200) / 2},${(height + 200) / 2})`
      );

    const group = svg
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
      .style('font-size', '12px')
      .text((d: any) => nodes[d.index].name)
      .on('mouseover', function (event: any, d: any) {
        const index = d.index;
        svg
          .selectAll('.ribbon')
          .filter(
            (r: any) => r.source.index === index || r.target.index === index
          )
          .style('fill', 'black')
          .style('stroke', 'black')
      })
      .on('mouseout', () => {
        svg
          .selectAll('.ribbon')
          .style('fill', 'skyblue')
          .style('stroke', 'skyblue');
      });

    svg
      .append('g')
      .attr('fill-opacity', 1.00)
      .selectAll('path')
      .data(chords)
      .enter()
      .append('path')
      .attr('class', 'ribbon')
      .attr('d', ribbon as unknown as (d: any) => string)
      .style('fill', 'skyblue')
      .style('stroke', 'skyblue');

    // Add legend
    const legend = svg
      .append('g')
      .attr('transform', `translate(${width / 2 + 100},${-height / 2 + 50})`);

    cohorts.forEach((cohort, i) => {
      const legendRow = legend.append('g').attr('transform', `translate(0, ${i * 20})`);

      legendRow
        .append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', color(cohort))

      legendRow
        .append('text')
        .attr('x', 20)
        .attr('y', 10)
        .attr('text-anchor', 'start')
        .style('font-size', '12px')
        .text(cohort)
        .attr("stroke, black");
    });

    console.log('Legend data:', cohorts); // Debugging line
  }
}
