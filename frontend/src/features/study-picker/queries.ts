import { queryOptions } from "@tanstack/react-query";

import { rankCohorts } from "./api";

export const studyPickerQueries = {
  rankings: (variables: readonly string[]) =>
    queryOptions({
      queryKey: ["study-picker", "rank", variables],
      queryFn: ({ signal }) => rankCohorts(variables, signal),
      enabled: variables.length > 0,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    }),
};
