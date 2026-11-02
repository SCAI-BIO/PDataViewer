import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchMetadata, type Metadata } from "@/lib/api/cohorts";

import { fetchStudyPickerVariables } from "../api";
import { studyPickerQueries } from "../queries";
import type { RankedCohort } from "../types";

const EMPTY_VARIABLES: string[] = [];
const EMPTY_RANKINGS: RankedCohort[] = [];
const EMPTY_METADATA: Metadata = {};

export function useStudyPicker() {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [submittedVariables, setSubmittedVariables] = useState<string[]>([]);

  const variablesQuery = useQuery({
    queryKey: ["study-picker", "variables"],
    queryFn: ({ signal }) => fetchStudyPickerVariables(signal),
  });

  const metadataQuery = useQuery({
    queryKey: ["cohorts", "metadata"],
    queryFn: ({ signal }) => fetchMetadata(signal),
  });

  const rankingQuery = useQuery(
    studyPickerQueries.rankings(submittedVariables),
  );

  function updateSelectedVariables(nextVariables: string[]) {
    const normalized = [
      ...new Set(
        nextVariables.map((variable) => variable.trim()).filter(Boolean),
      ),
    ];

    const unchanged =
      normalized.length === selectedVariables.length &&
      normalized.every(
        (variable, index) => variable === selectedVariables[index],
      );

    if (unchanged) return;
    setSelectedVariables(normalized);
    setSubmittedVariables([]);
  }

  function submitRanking() {
    if (selectedVariables.length === 0) return;

    const isSameSelection =
      selectedVariables.length === submittedVariables.length &&
      selectedVariables.every(
        (variable, index) => variable === submittedVariables[index],
      );

    if (isSameSelection) {
      void rankingQuery.refetch();
      return;
    }

    setSubmittedVariables([...selectedVariables]);
  }

  return {
    selectedVariables,
    submittedVariables,
    updateSelectedVariables,
    submitRanking,
    availableVariables: variablesQuery.data ?? EMPTY_VARIABLES,
    metadata: metadataQuery.data ?? EMPTY_METADATA,
    rankings: rankingQuery.data ?? EMPTY_RANKINGS,
    canRank: selectedVariables.length > 0 && !rankingQuery.isFetching,
    hasSubmitted: submittedVariables.length > 0,
    isRanking: rankingQuery.isFetching,
    variablesQuery,
    metadataQuery,
    rankingQuery,
  };
}
