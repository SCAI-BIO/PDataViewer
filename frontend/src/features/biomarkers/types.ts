export interface BiomarkerMeasurementRequest {
  readonly biomarker: string;
  readonly cohort: string;
  readonly diagnosis: string;
}

export type BiomarkerMeasurements = number[];

export interface BiomarkerDistribution {
  readonly label: string;
  readonly cohort: string;
  readonly diagnosis: string;
  readonly values: readonly number[];
}

export interface BiomarkerDiagnosisOption {
  readonly label: string;
  readonly cohort: string;
  readonly diagnosis: string;
}
