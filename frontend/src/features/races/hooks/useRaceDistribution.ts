import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { raceQueries } from "../queries";

const EMPTY_COHORTS: string[] = [];

export function useRaceDistribution() {
  const [selectedCohort, setSelectedCohort] = useState("");

  const cohortsQuery = useQuery(raceQueries.cohorts());
  const availableCohorts = cohortsQuery.data ?? EMPTY_COHORTS;

  const activeCohort = availableCohorts.includes(selectedCohort)
    ? selectedCohort
    : "";

  // Empty selection means all cohorts.
  const cohorts = activeCohort ? [activeCohort] : availableCohorts;

  const distributionQuery = useQuery(raceQueries.distribution(cohorts));

  function selectCohort(cohort: string) {
    setSelectedCohort(cohort.trim());
  }

  return {
    availableCohorts,
    selectedCohort: activeCohort,
    selectCohort,
    cohortsQuery,
    distributionQuery,
  };
}
