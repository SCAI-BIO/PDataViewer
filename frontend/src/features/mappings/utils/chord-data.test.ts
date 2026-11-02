import { describe, expect, it } from "vitest";

import { prepareChordData } from "./chord-data";
import type { ChordDiagramData } from "../types";

describe("prepareChordData", () => {
  it("resolves a connection between two cohorts", () => {
    const data: ChordDiagramData = {
      nodes: [
        { name: "Age", group: "PPMI" },
        { name: "Age at enrollment", group: "BioFIND" },
      ],
      links: [{ source: "Age", target: "Age at enrollment" }],
    };

    const result = prepareChordData(data);

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.nodes).toHaveLength(2);
    expect(result.chunks[0]?.links).toHaveLength(1);
    expect(result.diagnostics.unlinkedNodes).toBe(0);
  });

  it("resolves the only eligible cross-cohort pair", () => {
    const data: ChordDiagramData = {
      nodes: [
        { name: "Age", group: "PPMI" },
        { name: "Age", group: "BioFIND" },
        { name: "Enrollment age", group: "PPMI" },
      ],
      links: [{ source: "Age", target: "Enrollment age" }],
    };

    const result = prepareChordData(data);
    const links = result.chunks.flatMap((chunk) => chunk.links);

    expect(links).toHaveLength(1);

    const edge = links[0];

    expect(edge).toBeDefined();

    if (!edge) return;

    expect(new Set([edge.sourceId, edge.targetId])).toEqual(
      new Set([
        JSON.stringify(["BioFIND", "Age"]),
        JSON.stringify(["PPMI", "Enrollment age"]),
      ]),
    );
  });

  it("expands mappings across every matching cohort pair", () => {
    const data: ChordDiagramData = {
      nodes: [
        { name: "Age", group: "PPMI" },
        { name: "Age", group: "BioFIND" },
        { name: "Age at baseline", group: "PPMI" },
        { name: "Age at baseline", group: "PDBP" },
      ],
      links: [{ source: "Age", target: "Age at baseline" }],
    };

    const result = prepareChordData(data);
    const links = result.chunks.flatMap((chunk) => chunk.links);

    const expected = [
      [
        ["PPMI", "Age"],
        ["PDBP", "Age at baseline"],
      ],
      [
        ["BioFIND", "Age"],
        ["PPMI", "Age at baseline"],
      ],
      [
        ["BioFIND", "Age"],
        ["PDBP", "Age at baseline"],
      ],
    ];

    const expectedPairs = expected.map(([source, target]) =>
      JSON.stringify(
        [JSON.stringify(source), JSON.stringify(target)].toSorted(),
      ),
    );

    const actualPairs = links.map(({ sourceId, targetId }) =>
      JSON.stringify([sourceId, targetId].toSorted()),
    );

    expect(actualPairs.toSorted()).toEqual(expectedPairs.toSorted());

    expect(result.diagnostics.unresolvedLinks).toBe(0);
    expect(result.diagnostics.unlinkedNodes).toBe(0);
  });

  it("does not confuse composite keys containing separators", () => {
    const data: ChordDiagramData = {
      nodes: [
        { name: "C", group: "A|B" },
        { name: "B|C", group: "A" },
      ],
      links: [],
    };

    const result = prepareChordData(data);

    const nodes = result.chunks.flatMap((chunk) => chunk.nodes);

    expect(nodes).toHaveLength(2);
    expect(new Set(nodes.map((node) => node.id)).size).toBe(2);
    expect(result.diagnostics.duplicateNodes).toBe(0);
  });

  it("keeps oversized connected components intact", () => {
    const data: ChordDiagramData = {
      nodes: [
        { name: "A1", group: "A" },
        { name: "B1", group: "B" },
        { name: "A2", group: "A" },
        { name: "B2", group: "B" },
        { name: "Unlinked", group: "C" },
      ],
      links: [
        { source: "A1", target: "B1" },
        { source: "B1", target: "A2" },
        { source: "A2", target: "B2" },
      ],
    };

    const result = prepareChordData(data, 3);

    expect(result.chunks).toHaveLength(2);

    expect(result.chunks[0]?.nodes).toHaveLength(4);
    expect(result.chunks[0]?.links).toHaveLength(3);

    expect(result.chunks[1]?.nodes).toHaveLength(1);
    expect(result.chunks[1]?.links).toHaveLength(0);

    expect(result.diagnostics.oversizedComponents).toBe(1);
  });

  it("keeps independent components on separate pages when necessary", () => {
    const data: ChordDiagramData = {
      nodes: [
        { name: "A1", group: "A" },
        { name: "B1", group: "B" },
        { name: "A2", group: "A" },
        { name: "B2", group: "B" },
      ],
      links: [
        { source: "A1", target: "B1" },
        { source: "A2", target: "B2" },
      ],
    };

    const result = prepareChordData(data, 3);

    expect(result.chunks).toHaveLength(2);
    expect(result.chunks.every((chunk) => chunk.nodes.length <= 3)).toBe(true);

    expect(result.chunks.flatMap((chunk) => chunk.links)).toHaveLength(2);
  });

  it("deduplicates nodes and undirected links", () => {
    const data: ChordDiagramData = {
      nodes: [
        { name: "Age", group: "PPMI" },
        { name: "Age", group: "PPMI" },
        { name: "Enrollment age", group: "BioFIND" },
      ],
      links: [
        { source: "Age", target: "Enrollment age" },
        { source: "Enrollment age", target: "Age" },
      ],
    };

    const result = prepareChordData(data);

    expect(result.chunks[0]?.nodes).toHaveLength(2);
    expect(result.chunks[0]?.links).toHaveLength(1);

    expect(result.diagnostics.duplicateNodes).toBe(1);
    expect(result.diagnostics.duplicateLinks).toBe(1);
  });

  it("reports links that cannot be resolved", () => {
    const data: ChordDiagramData = {
      nodes: [
        { name: "Age", group: "PPMI" },
        { name: "Score", group: "PPMI" },
      ],
      links: [
        { source: "Age", target: "Score" },
        { source: "Age", target: "Missing variable" },
      ],
    };

    const result = prepareChordData(data);

    expect(result.diagnostics.unresolvedLinks).toBe(2);
    expect(result.chunks[0]?.links).toHaveLength(0);
  });

  it("returns an empty result for empty API data", () => {
    const result = prepareChordData({
      nodes: [],
      links: [],
    });

    expect(result.chunks).toEqual([]);
    expect(result.diagnostics.unresolvedLinks).toBe(0);
  });

  it("rejects invalid chunk sizes", () => {
    const data: ChordDiagramData = {
      nodes: [],
      links: [],
    };

    expect(() => prepareChordData(data, 0)).toThrow(RangeError);
    expect(() => prepareChordData(data, -1)).toThrow(RangeError);
    expect(() => prepareChordData(data, 2.5)).toThrow(RangeError);
  });

  it("does not modify the original API data", () => {
    const nodes = Object.freeze([
      Object.freeze({ name: "B", group: "PPMI" }),
      Object.freeze({ name: "A", group: "BioFIND" }),
    ]);

    const links = Object.freeze([Object.freeze({ source: "B", target: "A" })]);

    prepareChordData({ nodes, links });

    expect(nodes[0]?.name).toBe("B");
    expect(nodes[1]?.name).toBe("A");
    expect(links[0]?.source).toBe("B");
  });
});
