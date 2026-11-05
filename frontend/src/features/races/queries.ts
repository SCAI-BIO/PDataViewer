import { queryOptions } from "@tanstack/react-query";

import { fetchRaceCohorts, fetchRaceDistribution } from "./api";

export const raceQueries = {
  cohorts: () =>
    queryOptions({
      queryKey: ["races", "cohorts"] as const,
      queryFn: ({ signal }) => fetchRaceCohorts(signal),
    }),

  distribution: (cohorts: readonly string[]) => {
    const selected = [...new Set(cohorts)].toSorted();
    return queryOptions({
      queryKey: ["races", "distribution", selected] as const,
      queryFn: ({ signal }) => fetchRaceDistribution(selected, signal),
      enabled: selected.length > 0,
    });
  },
};
