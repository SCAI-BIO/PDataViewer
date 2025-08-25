import { inject, Injectable } from '@angular/core';
import * as d3 from 'd3';

import { map } from 'rxjs';

import { ApiService } from './api.service';
import {
  ChordData,
  ChordLink,
  ChordNode,
  LabeledChordGroup,
} from '../interfaces/chord-diagram';

@Injectable({ providedIn: 'root' })
export class ChordDiagramService {
  dataChunks: ChordData[] = [];
  private apiService = inject(ApiService);
  private colors: Record<string, string> = {};

  constructor() {
    this.fetchColors();
  }

  getColor(group: string): string {
    return this.colors[group] ?? '#cccccc';
  }

  /**
   * Splits the full chord dataset into connected chunks of nodes and links,
   * ensuring that semantically connected variables (across different study groups)
   * are kept in the same chunk and not split across diagrams.
   *
   * Nodes are uniquely identified using both their `name` and `group` fields to
   * prevent merging of distinct variables with the same label from different studies.
   *
   * The algorithm:
   * 1. Builds an adjacency graph where each node is identified by `name|group`.
   * 2. Traverses the graph to extract connected components (subgraphs).
   * 3. Packs multiple components into chunks of up to `chunkSize` nodes.
   *
   * This avoids issues such as:
   * - Singleton nodes with no visible links.
   * - Variables being split across multiple diagrams.
   * - Loss of connections due to duplicate `name` labels in different groups.
   *
   * @param data - The full chord data to be chunked.
   * @param chunkSize - The maximum number of nodes per resulting diagram chunk.
   * @returns An array of ChordData chunks, each containing connected and cohesive subsets of the full graph.
   */
  chunkData(data: ChordData, chunkSize: number): ChordData[] {
    // Define unique keys for each node (e.g., "Intracellular Water|Study1")
    const getKey = (node: ChordNode | { name: string; group: string }) =>
      `${node.name}|${node.group}`;

    const nodeMap = new Map<string, ChordNode>();
    data.nodes.forEach((node) => nodeMap.set(getKey(node), node));

    // Build adjacency based on fully qualified node IDs (name + group)
    const adjacency = new Map<string, Set<string>>();
    data.links.forEach(({ source, target }) => {
      const sourceNodes = data.nodes.filter((n) => n.name === source);
      const targetNodes = data.nodes.filter((n) => n.name === target);

      for (const s of sourceNodes) {
        for (const t of targetNodes) {
          const sKey = getKey(s);
          const tKey = getKey(t);

          if (!adjacency.has(sKey)) adjacency.set(sKey, new Set());
          if (!adjacency.has(tKey)) adjacency.set(tKey, new Set());

          adjacency.get(sKey)!.add(tKey);
          adjacency.get(tKey)!.add(sKey);
        }
      }
    });

    // Traverse the graph to find connected components
    const visited = new Set<string>();
    const components: { nodes: ChordNode[]; links: ChordLink[] }[] = [];

    for (const [key] of nodeMap) {
      if (visited.has(key)) continue;

      const queue = [key];
      const componentKeys = new Set<string>();

      while (queue.length) {
        const currentKey = queue.shift()!;
        if (visited.has(currentKey)) continue;

        visited.add(currentKey);
        componentKeys.add(currentKey);

        for (const neighbor of adjacency.get(currentKey) ?? []) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }

      const nodes = Array.from(componentKeys)
        .map((k) => nodeMap.get(k)!)
        .filter(Boolean);

      const nodeSet = new Set(nodes.map((n) => getKey(n)));
      const links = data.links.filter((link) => {
        const sources = data.nodes
          .filter((n) => n.name === link.source)
          .map((n) => getKey(n));
        const targets = data.nodes
          .filter((n) => n.name === link.target)
          .map((n) => getKey(n));
        return (
          sources.some((s) => nodeSet.has(s)) &&
          targets.some((t) => nodeSet.has(t))
        );
      });

      components.push({ nodes, links });
    }

    // Pack components into chunks
    const chunks: ChordData[] = [];
    let currentNodes: ChordNode[] = [];
    let currentLinks: ChordLink[] = [];
    let currentSize = 0;

    for (const component of components) {
      const size = component.nodes.length;
      if (currentSize + size > chunkSize && currentNodes.length > 0) {
        chunks.push({ nodes: currentNodes, links: currentLinks });
        currentNodes = [];
        currentLinks = [];
        currentSize = 0;
      }

      currentNodes.push(...component.nodes);
      currentLinks.push(...component.links);
      currentSize += size;
    }

    if (currentNodes.length > 0) {
      chunks.push({ nodes: currentNodes, links: currentLinks });
    }

    this.dataChunks = chunks;
    return chunks;
  }

  /**
   * Entry point for creating a chord diagram for a specific data chunk.
   * @param dataChunks - Array of ChordData chunks.
   * @param index - Index of the chunk to visualize.
   */
  createChordDiagrams(dataChunks: ChordData[], index: number): void {
    const chunk = dataChunks[index];
    this.createChordDiagram(chunk);
  }

  /**
   * Builds and renders the full chord diagram visualization.
   * @param data - The ChordData for the diagram.
   */
  private createChordDiagram(data: ChordData): void {
    const svgElement = d3.selectAll('.chord-diagram').node();
    const svg = d3.select(svgElement).select<SVGSVGElement>('svg');
    svg.selectAll('*').remove();

    const width = 800;
    const height = 800;
    const outerRadius = Math.min(width, height) * 0.4 - 100;
    const innerRadius = outerRadius - 0.1;

    const nodes = this.prepareNodes(data);
    const matrix = this.buildMatrix(nodes, data.links);
    const chords = d3.chord().padAngle(0.06).sortSubgroups(d3.descending)(
      matrix
    );

    const svgGroup = this.initSvgGroup(svg, width, height);

    const grouped = this.groupChordGroupsByName(chords.groups, nodes);
    this.drawGroupArcs(svgGroup, grouped, outerRadius);
    this.drawGroupLabels(svgGroup, grouped, outerRadius);
    this.drawNodeLabels(svgGroup, chords, nodes, outerRadius);
    this.drawRibbons(svgGroup, chords, innerRadius);
  }

  /**
   * Preprares node data by assigning unique IDs and sorting by group.
   * @param data - ChordData to extract and process nodes from.
   * @returns Sorted and ID-augmented node array.
   */
  private prepareNodes(data: ChordData): ChordNode[] {
    return data.nodes
      .map((node: ChordNode) => ({ ...node, id: `${node.name}_${node.group}` }))
      .sort((a, b) => a.group.localeCompare(b.group));
  }

  /**
   * Builds the adjacency matrix used for chord layout calculations.
   * @param nodes - Array of nodes to include in the matrix.
   * @param links - Array of links defining relationships between nodes.
   * @returns 2D matrix of connection weights.
   */
  private buildMatrix(nodes: ChordNode[], links: ChordLink[]): number[][] {
    const nodeIndex = new Map(
      nodes.map((node: ChordNode, i: number) => [node.id, i])
    );
    const matrix = Array(nodes.length)
      .fill(0)
      .map(() => Array(nodes.length).fill(0));

    links.forEach((link) => {
      const sourceNodes = nodes.filter((n) => n.name === link.source);
      const targetNodes = nodes.filter((n) => n.name === link.target);

      sourceNodes.forEach((s) => {
        targetNodes.forEach((t) => {
          if (s.group !== t.group) {
            const i = nodeIndex.get(s.id!);
            const j = nodeIndex.get(t.id!);
            if (i !== undefined && j !== undefined) {
              matrix[i][j] = 1;
              matrix[j][i] = 1;
            }
          }
        });
      });
    });

    return matrix;
  }

  /**
   * Group chord diagram arcs by group name.
   * @param groups - Array of chord group segments.
   * @param nodes - Original node definitions used for group lookup.
   * @returns Grouped chord segments keyed by group.
   */
  private groupChordGroupsByName(
    groups: d3.ChordGroup[],
    nodes: ChordNode[]
  ): [string, d3.ChordGroup[]][] {
    return d3.groups(groups, (d) => nodes[d.index].group);
  }

  /**
   * Initializes and returns the root <g> element for the chord diagram SVG.
   * @param svg - D3 selection of the parent SVG element.
   * @param width - Width of the viewBox.
   * @param height - Height of the viewBox.
   * @returns D3 selection of the translated <g> group.
   */
  private initSvgGroup(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number
  ) {
    const extraPadding = 200;
    return svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width + extraPadding} ${height + extraPadding}`)
      .style('overflow', 'visible') // prevents clipping of filter effects
      .append('g')
      .attr(
        'transform',
        `translate(${(width + extraPadding) / 2},${
          (height + extraPadding) / 2
        })`
      );
  }

  /**
   * Draws outer arcs to visually group related node arcs.
   * @param svgGroup - D3 selection of the root SVG group.
   * @param grouped - Grouped chord segments.
   * @param outerRadius - Readius for drawing the outer group arcs.
   */
  private drawGroupArcs(
    svgGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    grouped: [string, d3.ChordGroup[]][],
    outerRadius: number
  ) {
    const arc = d3
      .arc<d3.ChordGroup>()
      .innerRadius(outerRadius + 5)
      .outerRadius(outerRadius + 30);

    svgGroup
      .append('g')
      .attr('class', 'group-highlight')
      .selectAll('path')
      .data(grouped)
      .enter()
      .append('path')
      .attr('d', ([, groupChords]) => {
        const startAngle = d3.min(groupChords, (d) => d.startAngle)!;
        const endAngle = d3.max(groupChords, (d) => d.endAngle)!;
        return arc({
          startAngle,
          endAngle,
          value: 1,
          index: 0,
        } as d3.ChordGroup)!;
      })
      .attr('fill', ([group]) => this.getColor(group));
  }

  /**
   * Draws curved group labels along the outer arcs of the chord diagram.
   *
   * For each group of chord segments, this method generates a hidden SVG arc path
   * positioned just outside the outerRadius, and then renders the group name along
   * that path using <textPath>. The labels follow the curvature of the arc and
   * are centered within their respective group spans.
   *
   * @param svgGroup - The main SVG <g> container where the labels will be appended.
   * @param grouped - An array of tuples where each tuple contains a group name and the
   *                  corresponding chord group segments.
   * @param outerRadius - The base radius of the chord diagram used to position labels
   *                      slightly outside the outer arc.
   */
  private drawGroupLabels(
    svgGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    grouped: [string, d3.ChordGroup[]][],
    outerRadius: number
  ) {
    const groupLabels = svgGroup
      .append('g')
      .attr('class', 'group-labels')
      .selectAll('text')
      .data(grouped)
      .enter();

    // Create curved text paths for each group
    groupLabels
      .append('path')
      .attr('id', (d, i) => `groupLabelArc-${i}`)
      .attr('d', ([, groupChords]) => {
        const startAngle = d3.min(groupChords, (d) => d.startAngle)!;
        const endAngle = d3.max(groupChords, (d) => d.endAngle)!;
        const radius = outerRadius + 17.5; // Position in the middle of the arc (5px + 30px) / 2 + 5px

        // Generate an arc path for the text to follow
        const arcGenerator = d3
          .arc<null>()
          .innerRadius(radius)
          .outerRadius(radius)
          .startAngle(startAngle)
          .endAngle(endAngle);

        return arcGenerator(null)!;
      })
      .style('fill', 'none'); // Path should be invisible

    // Add text that follows the created path
    groupLabels
      .append('text')
      .attr('dy', '5px')
      .append('textPath')
      .attr('xlink:href', (d, i) => `#groupLabelArc-${i}`)
      .attr('startOffset', '25%') // Start text at 25% along the path
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'black')
      .text(([groupName]) => groupName);
  }

  /**
   * Draws node arc segments and their labels with hover interactivity.
   * @param svgGroup - D3 selection of the root SVG group.
   * @param chords - D3 chords containing groups and links.
   * @param nodes - Original node definitions.
   * @param outerRadius - Radius for drawing outer node arcs.
   */
  private drawNodeLabels(
    svgGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    chords: d3.Chords,
    nodes: ChordNode[],
    outerRadius: number
  ) {
    const arc = d3
      .arc<d3.ChordGroup>()
      .innerRadius(outerRadius - 0.1)
      .outerRadius(outerRadius);

    const group = svgGroup
      .append('g')
      .selectAll('g')
      .data(chords.groups)
      .enter()
      .append('g');

    group
      .append('path')
      .style('fill', '#e0e0e0')
      .style('stroke', '#bdbdbd')
      .attr('d', arc);

    group
      .append('text')
      .each((d: LabeledChordGroup) => {
        d.angle = (d.startAngle + d.endAngle) / 2;
      })
      .attr('dy', '.35em')
      .attr(
        'transform',
        (d: LabeledChordGroup) => `
        rotate(${(d.angle! * 180) / Math.PI - 90})
        translate(${outerRadius + 50})
        ${d.angle! > Math.PI ? 'rotate(180)' : ''}`
      )
      .style('text-anchor', (d: LabeledChordGroup) =>
        d.angle! > Math.PI ? 'end' : null
      )
      .style('font-size', (d: d3.ChordGroup) => {
        const label = nodes[d.index].name;
        if (label.length > 60) return '10px';
        if (label.length > 50) return '11px';
        if (label.length > 40) return '12px';
        if (label.length > 30) return '13px';
        if (label.length > 20) return '14px';
        return '15px';
      })
      .text((d: d3.ChordGroup) => nodes[d.index].name)
      .on('mouseover', function (event: MouseEvent, d: d3.ChordGroup) {
        const index = d.index;
        svgGroup
          .selectAll<SVGPathElement, d3.Chord>('path.ribbon')
          .filter(
            (r: d3.Chord) =>
              r.source.index === index || r.target.index === index
          )
          .transition()
          .duration(200)
          .style('fill', 'black')
          .style('stroke', 'black')
          .style('opacity', 0.8);
      })
      .on('mouseout', () => {
        svgGroup
          .selectAll<SVGPathElement, d3.Chord>('path.ribbon')
          .transition()
          .duration(200)
          .style('filter', null)
          .style('fill', '#0066cc')
          .style('stroke', 'white')
          .style('opacity', 0.9);
      });
  }

  /**
   * Draws the inner ribbons that represent connections between node arcs.
   * @param svgGroup - D3 selection of the root SVG group.
   * @param chords - D3 chords representing relationships.
   * @param innerRadius - Radius used for the ribbon path.
   */
  private drawRibbons(
    svgGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    chords: d3.Chords,
    innerRadius: number
  ) {
    const ribbon = d3.ribbon<unknown, d3.Chord>().radius(innerRadius);

    svgGroup
      .append('g')
      .attr('cursor', 'pointer')
      .selectAll<SVGPathElement, d3.Chord>('path')
      .data(chords)
      .enter()
      .append('path')
      .attr('class', 'ribbon')
      .style('filter', null)
      .attr('d', ribbon)
      .style('fill', '#0066cc')
      .style('stroke', 'white')
      .style('opacity', 0.9);
  }

  private fetchColors(): void {
    this.apiService
      .fetchMetadata()
      .pipe(
        map((metadata) => {
          const colors: Record<string, string> = {};
          for (const key in metadata) {
            if (Object.hasOwn(metadata, key)) {
              colors[key] = metadata[key].color;
            }
          }
          return colors;
        })
      )
      .subscribe({
        next: (v) => {
          this.colors = v;
        },
        error: (err) => {
          console.error('Error fetching colors', err);
          const detail = err.error?.detail;
          const message = err.error?.message || err.message;

          let errorMessage = 'An unknown error occurred.';
          if (detail && message) {
            errorMessage = `${message} — ${detail}`;
          } else if (detail || message) {
            errorMessage = detail || message;
          }

          alert(`An error occurred while fetching colors: ${errorMessage}`);
        },
      });
  }
}
