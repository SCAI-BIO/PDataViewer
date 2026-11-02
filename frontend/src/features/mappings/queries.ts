import { queryOptions } from "@tanstack/react-query";

import { fetchMetadata } from "@/lib/api/cohorts";
import { fetchModalities } from "@/lib/api/cdm";

import { fetchChordDiagram } from "./api";

export const mappingsQueries = {
  modalities: () =>
    queryOptions({
      queryKey: ["cdm", "modalities"] as const,
      queryFn: ({ signal }) => fetchModalities(signal),
    }),

  metadata: () =>
    queryOptions({
      queryKey: ["cohorts", "metadata"] as const,
      queryFn: ({ signal }) => fetchMetadata(signal),
    }),

  chord: (modality: string) => {
    const selectedModality = modality.trim();

    return queryOptions({
      queryKey: ["visualization", "chords", selectedModality] as const,
      queryFn: ({ signal }) => fetchChordDiagram(selectedModality, signal),
      enabled: selectedModality.length > 0,
    });
  },
};
