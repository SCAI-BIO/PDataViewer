import { api } from "@/lib/api/client";

import type {
  BiomarkerMeasurementRequest,
  BiomarkerMeasurements,
} from "./types";

export function fetchBiomarkers(signal?: AbortSignal): Promise<string[]> {
  return api.get<string[]>("/biomarkers/", { signal });
}

export function fetchBiomarkerCohorts(
  biomarker: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const params = new URLSearchParams({ biomarker });

  return api.get<string[]>(`/biomarkers/cohorts?${params}`, { signal });
}

export function fetchBiomarkerDiagnoses(
  biomarker: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const params = new URLSearchParams({ biomarker });

  return api.get<string[]>(`/biomarkers/diagnoses?${params}`, { signal });
}

export function fetchBiomarkerMeasurements(
  { biomarker, cohort, diagnosis }: BiomarkerMeasurementRequest,
  signal?: AbortSignal,
): Promise<BiomarkerMeasurements> {
  const params = new URLSearchParams({ biomarker });

  return api.get<BiomarkerMeasurements>(
    `/biomarkers/cohorts/${encodeURIComponent(cohort)}` +
      `/diagnoses/${encodeURIComponent(diagnosis)}?${params}`,
    { signal },
  );
}
