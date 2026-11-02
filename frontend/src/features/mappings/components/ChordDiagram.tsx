import {
  chord,
  ribbon,
  type Chord,
  type ChordGroup,
  type Chords,
  type ChordSubgroup,
} from "d3-chord";
import { arc } from "d3-shape";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ColorIndicator } from "@/components/data-display/ColorIndicator";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatNumber } from "@/lib/formatters";

import type { ChordChunk, MappingNode } from "../utils/chord-data";

interface ChordDiagramProps {
  chunk: ChordChunk;
  colors?: Readonly<Record<string, string>>;
  title?: string;
}

interface CohortBand {
  cohort: string;
  startAngle: number;
  endAngle: number;
}

const EMPTY_COLORS: Readonly<Record<string, string>> = {};

// Match the original Angular ChordBuilder geometry.
const OUTER_RADIUS = 220;
const INNER_RADIUS = OUTER_RADIUS - 0.1;

const COHORT_INNER_RADIUS = OUTER_RADIUS + 5;
const COHORT_OUTER_RADIUS = OUTER_RADIUS + 30;
const COHORT_LABEL_RADIUS = OUTER_RADIUS + 17.5;

const VARIABLE_LABEL_RADIUS = OUTER_RADIUS + 50;
const PADDING = 24;

const DEFAULT_COHORT_COLOR = "#cccccc";
const RIBBON_COLOR = "#0066cc";

// Minimum space for cohort names, e.g. PRoBaND with only one variable.
const MIN_COHORT_ANGLE = (20 * Math.PI) / 180;
const VARIABLE_PAD_ANGLE = 0.06;

const cohortArc = arc<CohortBand>()
  .innerRadius(COHORT_INNER_RADIUS)
  .outerRadius(COHORT_OUTER_RADIUS);

const cohortLabelArc = arc<CohortBand>()
  .innerRadius(COHORT_LABEL_RADIUS)
  .outerRadius(COHORT_LABEL_RADIUS);

const ribbonGenerator = ribbon<Chord, ChordSubgroup>().radius(INNER_RADIUS);

function getVariableFontSize(name: string): number {
  if (name.length > 60) return 10;
  if (name.length > 50) return 11;
  if (name.length > 40) return 12;
  if (name.length > 30) return 13;
  if (name.length > 20) return 14;
  return 15;
}

function compareNodes(a: MappingNode, b: MappingNode): number {
  return a.group.localeCompare(b.group) || a.name.localeCompare(b.name);
}

/**
 * Build the symmetric matrix used by d3.chord().
 *
 * Nodes are explicitly sorted by cohort before calling this
 * function so each cohort occupies one contiguous arc.
 */
function buildMatrix(
  nodes: readonly MappingNode[],
  chunk: ChordChunk,
): number[][] {
  const indices = new Map(nodes.map((node, index) => [node.id, index]));

  const matrix = Array.from({ length: nodes.length }, () =>
    Array<number>(nodes.length).fill(0),
  );

  for (const link of chunk.links) {
    const source = indices.get(link.sourceId);
    const target = indices.get(link.targetId);

    if (
      source === undefined ||
      target === undefined ||
      source === target ||
      nodes[source]?.group === nodes[target]?.group
    ) {
      continue;
    }

    matrix[source][target] = 1;
    matrix[target][source] = 1;
  }

  return matrix;
}

interface CohortAllocation {
  cohort: string;
  indices: number[];
  weight: number;
  minimum: number;
  span: number;
}

/**
 * Reserve a minimum angular span for small cohorts without inventing links.
 *
 * D3's native layout sizes every variable by its degree, which can leave
 * one-variable cohorts too narrow for their label. Redistribute the angular
 * space among cohorts and remap the real ribbon endpoints into their new
 * sectors. The original matrix and connections remain unchanged.
 */
function applyMinimumCohortAngles(
  chords: Chords,
  nodes: readonly MappingNode[],
  padAngle: number,
): void {
  const groups = chords.groups;
  const usableAngle = Math.PI * 2 - groups.length * padAngle;
  if (usableAngle <= 0) return;

  const cohorts: CohortAllocation[] = [];

  // Nodes were already sorted by cohort; each cohort is contiguous.
  for (const group of groups) {
    const name = nodes[group.index]?.group;
    if (!name) return;

    const previous = cohorts.at(-1);
    if (previous?.cohort === name) {
      previous.indices.push(group.index);
      previous.weight += group.value;
    } else {
      cohorts.push({
        cohort: name,
        indices: [group.index],
        weight: group.value,
        minimum: 0,
        span: 0,
      });
    }
  }

  // An outer band includes the gaps between variables of the same cohort.
  // Only its remaining *usable* arc needs to be reserved explicitly.
  const requiredAngle = (minimum: number): number =>
    cohorts.reduce(
      (total, cohort) =>
        total + Math.max(0, minimum - (cohort.indices.length - 1) * padAngle),
      0,
    );

  // Reserve at least 15% of the available angle for the real ribbons.
  // If the requested minimum cannot fit, use the largest feasible minimum.
  const maximumReservedAngle = usableAngle * 0.85;
  let effectiveMinimum = MIN_COHORT_ANGLE;
  if (requiredAngle(effectiveMinimum) > maximumReservedAngle) {
    let lower = 0;
    let upper = effectiveMinimum;

    for (let attempt = 0; attempt < 40; attempt++) {
      const middle = (lower + upper) / 2;
      if (requiredAngle(middle) > maximumReservedAngle) upper = middle;
      else lower = middle;
    }

    effectiveMinimum = lower;
  }

  for (const cohort of cohorts) {
    cohort.minimum = Math.max(
      0,
      effectiveMinimum - (cohort.indices.length - 1) * padAngle,
    );
  }

  // Water-fill the circle: protect undersized cohorts, then distribute the
  // remaining space proportionally to the actual number of connections.
  const pending = new Set(cohorts);
  let remainingAngle = usableAngle;
  let remainingWeight = cohorts.reduce((total, item) => total + item.weight, 0);
  let ribbonScale = 0;

  while (pending.size > 0) {
    const scale = remainingWeight > 0 ? remainingAngle / remainingWeight : 0;
    const undersized = [...pending].filter(
      (cohort) => cohort.weight * scale < cohort.minimum,
    );

    if (undersized.length === 0) {
      ribbonScale = scale;
      for (const cohort of pending) cohort.span = cohort.weight * scale;
      break;
    }

    for (const cohort of undersized) {
      cohort.span = cohort.minimum;
      remainingAngle -= cohort.minimum;
      remainingWeight -= cohort.weight;
      pending.delete(cohort);
    }
  }

  // Keep the total precisely equal to the full usable circumference.
  const allocated = cohorts.reduce((total, cohort) => total + cohort.span, 0);
  const largest = cohorts.reduce((best, cohort) =>
    cohort.weight > best.weight ? cohort : best,
  );
  largest.span += usableAngle - allocated;

  // Keep all genuine ribbon widths proportional to their original values.
  // The extra angle reserved for a small cohort is empty space inside its
  // colored group sector, not a fictitious mapping or a widened ribbon.
  const originals = groups.map((group) => ({
    startAngle: group.startAngle,
    endAngle: group.endAngle,
    realStart: 0,
    realWidth: 0,
  }));

  let angle = 0;
  for (const cohort of cohorts) {
    const extraPerNode =
      (cohort.span - cohort.weight * ribbonScale) / cohort.indices.length;

    for (const index of cohort.indices) {
      const group = groups[index];
      const original = originals[index];
      if (!group || !original) continue;

      const realWidth = group.value * ribbonScale;
      const width = realWidth + extraPerNode;
      original.realStart = angle + extraPerNode / 2;
      original.realWidth = realWidth;

      group.startAngle = angle;
      group.endAngle = angle + width;
      angle += width + padAngle;
    }
  }

  function remapSubgroup(subgroup: ChordSubgroup): void {
    const original = originals[subgroup.index];
    if (!original) return;

    const originalWidth = original.endAngle - original.startAngle;
    if (originalWidth <= 0) return;

    const factor = original.realWidth / originalWidth;
    subgroup.startAngle =
      original.realStart + (subgroup.startAngle - original.startAngle) * factor;
    subgroup.endAngle =
      original.realStart + (subgroup.endAngle - original.startAngle) * factor;
  }

  for (const connection of chords) {
    remapSubgroup(connection.source);
    remapSubgroup(connection.target);
  }
}

/**
 * Merge consecutive D3 variable groups into one cohort band.
 * This mirrors ChordBuilder.groupChordGroupsByName().
 */
function getCohortBands(
  groups: readonly ChordGroup[],
  nodes: readonly MappingNode[],
): CohortBand[] {
  const bands: CohortBand[] = [];

  for (const group of groups) {
    const cohort = nodes[group.index]?.group;
    if (!cohort) continue;

    const previous = bands.at(-1);

    if (previous?.cohort === cohort) {
      previous.endAngle = group.endAngle;
    } else {
      bands.push({
        cohort,
        startAngle: group.startAngle,
        endAngle: group.endAngle,
      });
    }
  }

  return bands;
}

export function ChordDiagram({
  chunk,
  colors = EMPTY_COLORS,
  title = "Variable mappings",
}: ChordDiagramProps) {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const contentRef = useRef<SVGGElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const diagram = useMemo(() => {
    if (chunk.nodes.length === 0 || chunk.links.length === 0) {
      return null;
    }

    // Important: sorting by cohort keeps all cohort variables
    // together in the circular layout.
    const nodes = chunk.nodes.toSorted(compareNodes);

    const matrix = buildMatrix(nodes, chunk);

    // Preserve the original spacing unless too many variables would consume
    // most of the circumference as padding.
    const padAngle = Math.min(
      VARIABLE_PAD_ANGLE,
      (Math.PI * 2 * 0.3) / nodes.length,
    );
    const chords = chord()
      .padAngle(padAngle)
      .sortSubgroups((a, b) => b - a)(matrix);

    applyMinimumCohortAngles(chords, nodes, padAngle);
    const bands = getCohortBands(chords.groups, nodes);

    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    return {
      nodes,
      nodeById,
      chords,
      bands,
    };
  }, [chunk]);

  /**
   * Reproduce the original SVG's data-dependent bounding box.
   *
   * D3 is only responsible for geometry; React renders the SVG.
   * The DOM measurement ensures full-length variable labels
   * aren't clipped or surrounded by excessive empty space.
   */
  useLayoutEffect(() => {
    if (!diagram) return;

    const svg = svgRef.current;
    const content = contentRef.current;

    if (!svg || !content || typeof content.getBBox !== "function") {
      return;
    }

    const bounds = content.getBBox();

    if (bounds.width <= 0 || bounds.height <= 0) return;

    const width = bounds.width + PADDING * 2;
    const height = bounds.height + PADDING * 2;

    svg.setAttribute(
      "viewBox",
      [bounds.x - PADDING, bounds.y - PADDING, width, height].join(" "),
    );
  }, [diagram]);

  const activeNodeId =
    hoveredNodeId && diagram?.nodeById.has(hoveredNodeId)
      ? hoveredNodeId
      : selectedNodeId && diagram?.nodeById.has(selectedNodeId)
        ? selectedNodeId
        : null;

  const activeNode = selectedNodeId
    ? diagram?.nodeById.get(selectedNodeId)
    : undefined;

  const connectedIds = new Set<string>();

  if (activeNode) {
    for (const link of chunk.links) {
      if (link.sourceId === activeNode.id) {
        connectedIds.add(link.targetId);
      } else if (link.targetId === activeNode.id) {
        connectedIds.add(link.sourceId);
      }
    }
  }

  const connectedNodes = [...connectedIds]
    .flatMap((nodeId) => {
      const node = diagram?.nodeById.get(nodeId);
      return node ? [node] : [];
    })
    .toSorted(compareNodes);

  function toggleSelection(nodeId: string): void {
    setSelectedNodeId((current) => (current === nodeId ? null : nodeId));
  }

  function getColor(cohort: string): string {
    return colors[cohort] ?? DEFAULT_COHORT_COLOR;
  }

  if (!diagram) {
    return (
      <EmptyState
        message="No mappings available"
        description="No resolved variable connections are available for this diagram."
      />
    );
  }

  return (
    <section
      aria-label="Variable mapping visualization"
      className="w-full min-w-0 space-y-5 rounded-xl border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="space-y-1">
        <p className="text-sm leading-6 text-muted-foreground">
          Hover to highlight connections, or click a variable to view its
          mappings.
        </p>
      </div>

      <figure className="mx-auto w-full max-w-180 space-y-3">
        <div className="w-full min-w-0 rounded-lg border bg-white p-2 sm:p-3">
          <svg
            ref={svgRef}
            viewBox="-450 -450 900 900"
            className="mx-auto block h-auto w-full max-h-[70vh]"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-description`}
            xmlns="http://www.w3.org/2000/svg"
          >
            <title id={`${id}-title`}>{title}</title>

            <desc id={`${id}-description`}>
              Chord diagram displaying semantic variable mappings. Each cohort
              occupies one colored circular arc with its name on the arc. Blue
              ribbons represent mappings between cohort variables.
            </desc>

            {/* Curved text paths, one per cohort. */}
            <defs>
              {diagram.bands.map((band, index) => (
                <path
                  key={band.cohort}
                  id={`${id}-cohort-${index}`}
                  d={cohortLabelArc(band) ?? undefined}
                />
              ))}
            </defs>

            <g ref={contentRef}>
              {/* Blue ribbons matching the original visualization. */}
              <g className="mapping-ribbons">
                {diagram.chords.map((connection) => {
                  const source = diagram.nodes[connection.source.index];

                  const target = diagram.nodes[connection.target.index];

                  if (!source || !target) return null;

                  const highlighted =
                    activeNodeId === source.id || activeNodeId === target.id;

                  const isActive = activeNodeId !== null && highlighted;

                  return (
                    <path
                      key={JSON.stringify([source.id, target.id].toSorted())}
                      d={ribbonGenerator(connection) ?? undefined}
                      fill={isActive ? "#000000" : RIBBON_COLOR}
                      stroke={isActive ? "#000000" : "#ffffff"}
                      strokeWidth={0.6}
                      opacity={isActive ? 0.8 : 0.9}
                      className="transition-colors duration-200"
                    >
                      <title>
                        {source.group}: {source.name} ↔ {target.group}:{" "}
                        {target.name}
                      </title>
                    </path>
                  );
                })}
              </g>

              {/* One continuous colored arc per cohort. */}
              <g className="group-highlight">
                {diagram.bands.map((band) => (
                  <path
                    key={band.cohort}
                    d={cohortArc(band) ?? undefined}
                    fill={getColor(band.cohort)}
                  >
                    <title>{band.cohort}</title>
                  </path>
                ))}
              </g>

              {/* Names written directly on the cohort arcs. */}
              <g className="group-labels">
                {diagram.bands.map((band, index) => (
                  <text
                    key={band.cohort}
                    dy={5}
                    fontSize={12}
                    fontWeight={700}
                    fill="#000000"
                    pointerEvents="none"
                  >
                    <textPath
                      href={`#${id}-cohort-${index}`}
                      startOffset="25%"
                      textAnchor="middle"
                    >
                      {band.cohort}
                    </textPath>
                  </text>
                ))}
              </g>

              {/* Full variable names around the circle. */}
              <g className="variable-labels">
                {diagram.chords.groups.map((group) => {
                  const node = diagram.nodes[group.index];
                  if (!node) return null;

                  const angle = (group.startAngle + group.endAngle) / 2;

                  const degrees = (angle * 180) / Math.PI - 90;

                  const isLeft = angle > Math.PI;

                  const transform = [
                    `rotate(${degrees})`,
                    `translate(${VARIABLE_LABEL_RADIUS})`,
                    isLeft ? "rotate(180)" : "",
                  ].join(" ");

                  const isSelected = activeNodeId === node.id;

                  return (
                    <text
                      key={node.id}
                      transform={transform}
                      textAnchor={isLeft ? "end" : "start"}
                      dy=".35em"
                      fontSize={getVariableFontSize(node.name)}
                      fontWeight={isSelected ? 700 : 400}
                      fill="#000000"
                      className="cursor-pointer select-none"
                      onPointerEnter={() => setHoveredNodeId(node.id)}
                      onPointerLeave={() => setHoveredNodeId(null)}
                      onPointerUp={(event) => {
                        if (event.button === 0) {
                          toggleSelection(node.id);
                        }
                      }}
                    >
                      {node.name}
                    </text>
                  );
                })}
              </g>
            </g>
          </svg>
        </div>
      </figure>

      {/* Variable details panel — displayed only after selection */}
      {activeNode &&
        createPortal(
          <aside
            aria-label={`Mappings for ${activeNode.name} (${activeNode.group})`}
            className="fixed inset-x-4 bottom-4 z-50 max-h-[70dvh] overflow-y-auto rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl lg:inset-x-auto lg:right-4 lg:top-1/2 lg:bottom-auto lg:w-80 lg:max-h-[75dvh] lg:-translate-y-1/2"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-semibold wrap-anywhere">
                  {activeNode.name}
                </p>

                <div className="flex items-center gap-2">
                  <ColorIndicator color={getColor(activeNode.group)} />

                  <span className="text-xs text-muted-foreground">
                    {activeNode.group}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="shrink-0 rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Close
              </button>
            </div>

            <div className="border-t pt-3">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                {formatNumber(connectedNodes.length)}{" "}
                {connectedNodes.length === 1
                  ? "mapped variable"
                  : "mapped variables"}
              </p>

              <ul className="space-y-3">
                {connectedNodes.map((node) => (
                  <li key={node.id} className="flex min-w-0 items-start gap-2">
                    <ColorIndicator color={getColor(node.group)} />

                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-medium wrap-anywhere">
                        {node.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {node.group}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>,
          document.body,
        )}

      {/* Accessible alternative to mouse-only hover. */}
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Browse variables ({formatNumber(diagram.nodes.length)})
        </summary>

        <div className="mt-3 grid max-h-60 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {diagram.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              aria-pressed={selectedNodeId === node.id}
              onClick={() => toggleSelection(node.id)}
              className="flex min-w-0 items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:bg-primary/5"
            >
              <ColorIndicator color={getColor(node.group)} />

              <span className="min-w-0">
                <span className="block wrap-anywhere font-medium">
                  {node.name}
                </span>

                <span className="block text-muted-foreground">
                  {node.group}
                </span>
              </span>
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}
