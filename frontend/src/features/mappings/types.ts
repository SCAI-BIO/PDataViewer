/**
 * A variable belonging to a particular cohort.
 */
export interface ChordNode {
  readonly name: string;
  readonly group: string;
}

export interface ChordLink {
  readonly source: string;
  readonly target: string;
}

export interface ChordDiagramData {
  readonly nodes: readonly ChordNode[];
  readonly links: readonly ChordLink[];
}
