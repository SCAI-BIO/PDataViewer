import type { ChordDiagramData, ChordNode } from "../types";

export interface MappingNode extends ChordNode {
  readonly id: string;
}

export interface MappingLink {
  readonly sourceId: string;
  readonly targetId: string;
}

export interface ChordChunk {
  readonly nodes: readonly MappingNode[];
  readonly links: readonly MappingLink[];
}

export interface ChordDataDiagnostics {
  readonly unresolvedLinks: number;
  readonly duplicateLinks: number;
  readonly duplicateNodes: number;
  readonly invalidNodes: number;
  readonly unlinkedNodes: number;
  readonly oversizedComponents: number;
}

export interface PreparedChordData {
  readonly chunks: readonly ChordChunk[];
  readonly diagnostics: ChordDataDiagnostics;
}

function getNodeId(node: ChordNode): string {
  return JSON.stringify([node.group, node.name]);
}

function compareNodes(a: MappingNode, b: MappingNode): number {
  return a.group.localeCompare(b.group) || a.name.localeCompare(b.name);
}

/**
 * Prepare API chord data for visualization.
 *
 * Mapping semantics match the original Angular ChordBuilder:
 *
 * For every name-based link, connect EVERY matching source
 * and target node belonging to different cohorts.
 *
 * Connections are deduplicated as undirected node pairs.
 * Connected components remain together when chunking.
 */
export function prepareChordData(
  data: ChordDiagramData,
  maxNodes = 40,
): PreparedChordData {
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1) {
    throw new RangeError("maxNodes must be a positive safe integer");
  }

  let duplicateNodes = 0;
  let invalidNodes = 0;
  let duplicateLinks = 0;
  let unresolvedLinks = 0;
  let oversizedComponents = 0;

  // 1. Identify each variable by name AND cohort.
  const nodeMap = new Map<string, MappingNode>();

  for (const rawNode of data.nodes) {
    const name = rawNode.name.trim();
    const group = rawNode.group.trim();

    if (!name || !group) {
      invalidNodes++;
      continue;
    }

    const id = getNodeId({ name, group });

    if (nodeMap.has(id)) {
      duplicateNodes++;
      continue;
    }

    nodeMap.set(id, { id, name, group });
  }

  const nodes = [...nodeMap.values()].toSorted(compareNodes);

  const nodesByName = new Map<string, MappingNode[]>();

  for (const node of nodes) {
    const matches = nodesByName.get(node.name) ?? [];
    matches.push(node);
    nodesByName.set(node.name, matches);
  }

  // 2. Expand all name-based links across matching cohorts.
  const links: MappingLink[] = [];

  const seenInputLinks = new Set<string>();
  const seenResolvedLinks = new Set<string>();

  const adjacency = new Map(
    nodes.map((node) => [node.id, new Set<string>()] as const),
  );

  for (const rawLink of data.links) {
    const sourceName = rawLink.source.trim();
    const targetName = rawLink.target.trim();

    if (!sourceName || !targetName) {
      unresolvedLinks++;
      continue;
    }

    // Mappings are undirected.
    const inputKey = JSON.stringify([sourceName, targetName].toSorted());

    if (seenInputLinks.has(inputKey)) {
      duplicateLinks++;
      continue;
    }

    seenInputLinks.add(inputKey);

    const sources = nodesByName.get(sourceName) ?? [];
    const targets = nodesByName.get(targetName) ?? [];

    let hasCrossCohortPair = false;

    // Exact behavior of Angular's buildMatrix():
    // expand every matching cross-cohort pair.
    for (const source of sources) {
      for (const target of targets) {
        if (source.group === target.group) {
          continue;
        }

        hasCrossCohortPair = true;

        const [sourceId, targetId] = [source.id, target.id].toSorted();

        const resolvedKey = JSON.stringify([sourceId, targetId]);

        // Avoid duplicate undirected edges.
        if (seenResolvedLinks.has(resolvedKey)) {
          continue;
        }

        seenResolvedLinks.add(resolvedKey);

        links.push({ sourceId, targetId });

        adjacency.get(sourceId)?.add(targetId);
        adjacency.get(targetId)?.add(sourceId);
      }
    }

    // Only genuinely unresolvable input links are counted:
    // missing endpoints or no cross-cohort pair.
    if (!hasCrossCohortPair) {
      unresolvedLinks++;
    }
  }

  const unlinkedNodes = nodes.filter(
    (node) => (adjacency.get(node.id)?.size ?? 0) === 0,
  ).length;

  // 3. Find connected components using the expanded graph.
  const components: {
    nodes: MappingNode[];
    links: MappingLink[];
  }[] = [];

  const componentByNodeId = new Map<string, number>();

  for (const node of nodes) {
    if (componentByNodeId.has(node.id)) continue;

    const componentIndex = components.length;
    const pending = [node.id];
    const componentNodes: MappingNode[] = [];

    while (pending.length > 0) {
      const id = pending.pop();

      if (id === undefined || componentByNodeId.has(id)) {
        continue;
      }

      componentByNodeId.set(id, componentIndex);

      const current = nodeMap.get(id);

      if (current) {
        componentNodes.push(current);
      }

      for (const neighbor of adjacency.get(id) ?? []) {
        if (!componentByNodeId.has(neighbor)) {
          pending.push(neighbor);
        }
      }
    }

    components.push({
      nodes: componentNodes.toSorted(compareNodes),
      links: [],
    });
  }

  // Assign connections to their components.
  for (const link of links) {
    const index = componentByNodeId.get(link.sourceId);

    if (index !== undefined) {
      components[index]?.links.push(link);
    }
  }

  // 4. Pack complete components into diagram pages.
  const chunks: ChordChunk[] = [];

  let currentNodes: MappingNode[] = [];
  let currentLinks: MappingLink[] = [];

  function flushChunk(): void {
    if (currentNodes.length === 0) return;

    chunks.push({
      nodes: currentNodes,
      links: currentLinks,
    });

    currentNodes = [];
    currentLinks = [];
  }

  for (const component of components) {
    const size = component.nodes.length;

    if (size > maxNodes) {
      oversizedComponents++;
    }

    if (currentNodes.length > 0 && currentNodes.length + size > maxNodes) {
      flushChunk();
    }

    currentNodes.push(...component.nodes);
    currentLinks.push(...component.links);
  }

  flushChunk();

  return {
    chunks,
    diagnostics: {
      unresolvedLinks,
      duplicateLinks,
      duplicateNodes,
      invalidNodes,
      unlinkedNodes,
      oversizedComponents,
    },
  };
}
