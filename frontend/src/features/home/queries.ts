import { queryOptions } from "@tanstack/react-query";

import { fetchModalities, fetchVariables } from "@/lib/api/cdm";
import { fetchCohorts, fetchMetadata } from "@/lib/api/cohorts";

export const homeQueries = {
  cohorts: () =>
    queryOptions({
      queryKey: ["cohorts", "list"],
      queryFn: ({ signal }) => fetchCohorts(signal),
    }),

  metadata: () =>
    queryOptions({
      queryKey: ["cohorts", "metadata"],
      queryFn: ({ signal }) => fetchMetadata(signal),
    }),

  modalities: () =>
    queryOptions({
      queryKey: ["cdm", "modalities"],
      queryFn: ({ signal }) => fetchModalities(signal),
    }),

  variables: () =>
    queryOptions({
      queryKey: ["cdm", "variables"],
      queryFn: ({ signal }) => fetchVariables(signal),
    }),
};
