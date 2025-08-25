export interface CohortMetadata {
  readonly participants: number;
  readonly healthyControls: number;
  readonly prodromalPatients: number;
  readonly pdPatients: number;
  readonly longitudinalPatients: number;
  readonly followUpInterval: string;
  readonly location: string;
  readonly doi: string;
  readonly link: string;
  readonly color: string;
}

export interface CohortData extends CohortMetadata {
  cohort: string;
}

export type Metadata = Readonly<Record<string, CohortMetadata>>;
