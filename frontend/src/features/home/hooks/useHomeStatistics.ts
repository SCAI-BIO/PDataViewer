import { useQueries } from "@tanstack/react-query";

import { homeQueries } from "../queries";

export function useHomeStatistics() {
  const [cohorts, metadata, modalities, variables] = useQueries({
    queries: [
      homeQueries.cohorts(),
      homeQueries.metadata(),
      homeQueries.modalities(),
      homeQueries.variables(),
    ],
  });

  const participantCount = metadata.data
    ? Object.values(metadata.data).reduce(
        (total, cohort) => total + (cohort.participants ?? 0),
        0,
      )
    : null;

  const statistics = [
    { label: "Cohorts", value: cohorts.data?.length ?? null },
    { label: "Participants", value: participantCount },
    { label: "Variables Mapped", value: variables.data?.length ?? null },
    {
      label: "Compared Modalities",
      value: modalities.data?.length ?? null,
    },
  ];

  const isLoading =
    cohorts.isPending ||
    metadata.isPending ||
    modalities.isPending ||
    variables.isPending;

  const error =
    cohorts.error ?? metadata.error ?? modalities.error ?? variables.error;

  return {
    statistics,
    isLoading,
    error,
  };
}
