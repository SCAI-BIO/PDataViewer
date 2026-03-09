export interface ChordNode {
  readonly name: string;
  readonly group: string;
  readonly id?: string;
}

export interface ChordLink {
  readonly source: string;
  readonly target: string;
}

export interface ChordData {
  readonly nodes: ChordNode[];
  readonly links: ChordLink[];
}

export interface LabeledChordGroup extends d3.ChordGroup {
  angle?: number;
}
