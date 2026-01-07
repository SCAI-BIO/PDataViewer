export interface CohortMetadata {
  readonly participants: number;
  readonly controlParticipants: number;
  readonly prodromalParticipants: number;
  readonly pdParticipants: number;
  readonly longitudinalParticipants: number;
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
