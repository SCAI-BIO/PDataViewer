import {
  fetchMetadata,
  type CohortData,
  type Metadata,
} from "@/lib/api/cohorts";
import { queryOptions } from "@tanstack/react-query";

function toCohortRows(metadata: Metadata): CohortData[] {
  return Object.entries(metadata).map(([cohort, values]) => ({
    cohort,
    ...values,
  }));
}

export const cohortQueries = {
  metadata: () =>
    queryOptions({
      queryKey: ["cohorts", "metadata"],
      queryFn: ({ signal }) => fetchMetadata(signal),
      select: toCohortRows,
    }),
};
