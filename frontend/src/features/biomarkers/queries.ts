import { queryOptions } from "@tanstack/react-query";

import {
  fetchBiomarkers,
  fetchBiomarkerCohorts,
  fetchBiomarkerDiagnoses,
  fetchBiomarkerMeasurements,
} from "./api";

import type { BiomarkerMeasurementRequest } from "./types";

export const biomarkerQueries = {
  biomarkers: () =>
    queryOptions({
      queryKey: ["biomarkers", "list"],
      queryFn: ({ signal }) => fetchBiomarkers(signal),
    }),

  cohorts: (biomarker: string) => {
    const selectedBiomarker = biomarker.trim();

    return queryOptions({
      queryKey: ["biomarkers", "cohorts", selectedBiomarker],
      queryFn: ({ signal }) => fetchBiomarkerCohorts(selectedBiomarker, signal),
      enabled: selectedBiomarker.length > 0,
    });
  },

  diagnoses: (biomarker: string) => {
    const selectedBiomarker = biomarker.trim();

    return queryOptions({
      queryKey: ["biomarkers", "diagnoses", selectedBiomarker],
      queryFn: ({ signal }) =>
        fetchBiomarkerDiagnoses(selectedBiomarker, signal),
      enabled: selectedBiomarker.length > 0,
    });
  },

  measurements: (request: BiomarkerMeasurementRequest) => {
    const biomarker = request.biomarker.trim();
    const cohort = request.cohort.trim();
    const diagnosis = request.diagnosis.trim();

    return queryOptions({
      queryKey: ["biomarkers", "measurements", biomarker, cohort, diagnosis],
      queryFn: ({ signal }) =>
        fetchBiomarkerMeasurements({ biomarker, cohort, diagnosis }, signal),
      enabled: Boolean(biomarker && cohort && diagnosis),
    });
  },
};
