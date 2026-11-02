import { queryOptions } from "@tanstack/react-query";

import {
  fetchLongitudinalData,
  fetchLongitudinalDataForCohort,
  fetchLongitudinalVariables,
} from "./api";

export const longitudinalQueries = {
  variables: () =>
    queryOptions({
      queryKey: ["longitudinal", "variables"],
      queryFn: ({ signal }) => fetchLongitudinalVariables(signal),
    }),

  byVariable: (variable: string) => {
    const selectedVariable = variable.trim();

    return queryOptions({
      queryKey: ["longitudinal", "data", selectedVariable],
      queryFn: ({ signal }) => fetchLongitudinalData(selectedVariable, signal),
      enabled: selectedVariable.length > 0,
    });
  },

  byCohort: (variable: string, cohort: string) => {
    const selectedVariable = variable.trim();
    const selectedCohort = cohort.trim();

    return queryOptions({
      queryKey: [
        "longitudinal",
        "data",
        selectedVariable,
        "cohort",
        selectedCohort,
      ],
      queryFn: ({ signal }) =>
        fetchLongitudinalDataForCohort(
          selectedVariable,
          selectedCohort,
          signal,
        ),
      enabled: Boolean(selectedVariable && selectedCohort),
    });
  },
};
