import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { fetchMetadata, type Metadata } from "@/lib/api/cohorts";

import { biomarkerQueries } from "../queries";
import type { BiomarkerDiagnosisOption, BiomarkerDistribution } from "../types";
import { parseDiagnosisOptions } from "../utils/diagnosis-options";

const EMPTY_NAMES: string[] = [];
const EMPTY_OPTIONS: BiomarkerDiagnosisOption[] = [];
const EMPTY_COLORS: Readonly<Record<string, string>> = {};

interface MeasurementError {
  readonly label: string;
  readonly message: string;
}

function selectCohortColors(metadata: Metadata): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata).map(([cohort, values]) => [cohort, values.color]),
  );
}

export function useBiomarkers() {
  const [selectedBiomarker, setSelectedBiomarker] = useState("");

  const [selectedDiagnosisLabels, setSelectedDiagnosisLabels] = useState<
    string[]
  >([]);

  const biomarkersQuery = useQuery(biomarkerQueries.biomarkers());
  const cohortsQuery = useQuery(biomarkerQueries.cohorts(selectedBiomarker));

  const diagnosesQuery = useQuery(
    biomarkerQueries.diagnoses(selectedBiomarker),
  );

  const metadataQuery = useQuery({
    queryKey: ["cohorts", "metadata"],
    queryFn: ({ signal }) => fetchMetadata(signal),
    select: selectCohortColors,
  });

  const availableDiagnosisOptions = useMemo(() => {
    if (!cohortsQuery.data || !diagnosesQuery.data) {
      return EMPTY_OPTIONS;
    }

    return parseDiagnosisOptions(diagnosesQuery.data, cohortsQuery.data);
  }, [cohortsQuery.data, diagnosesQuery.data]);

  const availableDiagnosisLabels = useMemo(
    () => availableDiagnosisOptions.map((option) => option.label),
    [availableDiagnosisOptions],
  );

  const selectedGroups = useMemo(() => {
    const optionsByLabel = new Map(
      availableDiagnosisOptions.map((option) => [option.label, option]),
    );

    return selectedDiagnosisLabels.flatMap((label) => {
      const option = optionsByLabel.get(label);
      return option ? [option] : [];
    });
  }, [availableDiagnosisOptions, selectedDiagnosisLabels]);

  const measurementQueries = useQueries({
    queries: selectedGroups.map(({ cohort, diagnosis }) =>
      biomarkerQueries.measurements({
        biomarker: selectedBiomarker,
        cohort,
        diagnosis,
      }),
    ),
  });

  const distributions: BiomarkerDistribution[] = [];
  const failedGroups: MeasurementError[] = [];
  const unavailableGroups: string[] = [];

  for (const [index, result] of measurementQueries.entries()) {
    const group = selectedGroups[index];
    if (!group) continue;

    if (result.isError) {
      failedGroups.push({
        label: group.label,
        message: result.error.message,
      });
    }

    if (result.data !== undefined) {
      if (result.data.some(Number.isFinite)) {
        distributions.push({
          label: group.label,
          cohort: group.cohort,
          diagnosis: group.diagnosis,
          values: result.data,
        });
      } else {
        unavailableGroups.push(group.label);
      }
    }
  }

  function selectBiomarker(biomarker: string) {
    const normalized = biomarker.trim();
    if (normalized === selectedBiomarker) return;
    setSelectedBiomarker(normalized);
    setSelectedDiagnosisLabels([]);
  }

  function updateSelectedDiagnosisLabels(next: string[]) {
    const available = new Set(availableDiagnosisLabels);

    const normalized = [
      ...new Set(next.filter((label) => available.has(label))),
    ];

    setSelectedDiagnosisLabels((current) => {
      const unchanged =
        current.length === normalized.length &&
        current.every((label, index) => label === normalized[index]);

      return unchanged ? current : normalized;
    });
  }

  function retryFailedMeasurements() {
    for (const result of measurementQueries) {
      if (result.isError) {
        void result.refetch();
      }
    }
  }

  const isLoadingMeasurements = measurementQueries.some(
    (result) => result.isLoading,
  );

  const isFetchingMeasurements = measurementQueries.some(
    (result) => result.isFetching,
  );

  return {
    selectedBiomarker,
    selectedDiagnosisLabels,
    selectBiomarker,
    updateSelectedDiagnosisLabels,
    availableBiomarkers: biomarkersQuery.data ?? EMPTY_NAMES,
    availableDiagnosisOptions,
    availableDiagnosisLabels,
    distributions,
    cohortColors: metadataQuery.data ?? EMPTY_COLORS,
    isLoadingDiagnosisOptions:
      cohortsQuery.isLoading || diagnosesQuery.isLoading,
    isLoadingMeasurements,
    isFetchingMeasurements,
    failedGroups,
    unavailableGroups,
    biomarkersQuery,
    cohortsQuery,
    diagnosesQuery,
    metadataQuery,
    measurementQueries,
    retryFailedMeasurements,
  };
}
