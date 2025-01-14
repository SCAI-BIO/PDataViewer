export interface CohortMetadata {
  readonly Participants: number;
  readonly HealthyControls: number;
  readonly ProdromalPatients: number;
  readonly PDPatients: number;
  readonly LongitudinalPatients: number;
  readonly FollowUpInterval: string;
  readonly Location: string;
  readonly DOI: string;
  readonly Link: string;
  readonly Color: string;
}

export interface Metadata {
  readonly [key: string]: CohortMetadata;
}
