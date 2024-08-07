export interface CohortMetadata {
  Participants: number;
  HealthyControls: number;
  ProdromalPatients: number;
  PDPatients: number;
  LongitudinalPatients: number;
  FollowUpInterval: string;
  Location: string;
  DOI: string;
  Link: string;
  Color: string;
}

export interface Metadata {
  [key: string]: CohortMetadata;
}
