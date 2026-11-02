import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { Metadata } from "@/lib/api/cohorts";

import { mappingsQueries } from "../queries";
import { prepareChordData } from "../utils/chord-data";
import type { ChordChunk, PreparedChordData } from "../utils/chord-data";

const MAX_NODES_PER_PAGE = 40;

const EMPTY_MODALITIES: readonly string[] = [];
const EMPTY_COLORS: Readonly<Record<string, string>> = {};

const EMPTY_PREPARED: PreparedChordData = {
  chunks: [],
  diagnostics: {
    unresolvedLinks: 0,
    duplicateLinks: 0,
    duplicateNodes: 0,
    invalidNodes: 0,
    unlinkedNodes: 0,
    oversizedComponents: 0,
  },
};

/**
 * Extract cohort colors from shared metadata.
 *
 * TanStack Query applies select per observer, so the
 * underlying metadata cache retains its original shape.
 */
function selectCohortColors(metadata: Metadata): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata).map(([cohort, values]) => [cohort, values.color]),
  );
}

/**
 * Prepare only nodes involved in resolved connections
 * for visualization.
 *
 * Isolated nodes remain accounted for in diagnostics.
 */
function getRenderableChunks(chunks: readonly ChordChunk[]): ChordChunk[] {
  return chunks.flatMap((chunk) => {
    if (chunk.links.length === 0) {
      return [];
    }

    const connectedIds = new Set(
      chunk.links.flatMap(({ sourceId, targetId }) => [sourceId, targetId]),
    );

    return [
      {
        nodes: chunk.nodes.filter((node) => connectedIds.has(node.id)),
        links: chunk.links,
      },
    ];
  });
}

export function useMappings() {
  const [selectedModality, setSelectedModality] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  // Available modalities.
  const modalitiesQuery = useQuery(mappingsQueries.modalities());

  // Reuse the shared cohort metadata cache.
  const metadataQuery = useQuery({
    ...mappingsQueries.metadata(),
    select: selectCohortColors,
  });

  // Fetch chord data only after selecting a modality.
  const chordQuery = useQuery(mappingsQueries.chord(selectedModality));

  // Transform API data into connected graph components.
  const prepared = useMemo(
    () =>
      chordQuery.data === undefined
        ? EMPTY_PREPARED
        : prepareChordData(chordQuery.data, MAX_NODES_PER_PAGE),
    [chordQuery.data],
  );

  // Exclude isolated nodes from rendered diagrams.
  const chunks = useMemo(
    () => getRenderableChunks(prepared.chunks),
    [prepared],
  );

  const totalPages = chunks.length;

  // Keep the index valid if a refetch produces fewer pages.
  const currentPageIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));

  const currentChunk = chunks[currentPageIndex] ?? null;

  const currentPage = currentChunk ? currentPageIndex + 1 : 0;

  const canGoPrevious = currentPageIndex > 0;
  const canGoNext = currentPageIndex < totalPages - 1;

  function selectModality(modality: string) {
    const normalized = modality.trim();

    if (normalized === selectedModality) return;

    setSelectedModality(normalized);
    setPageIndex(0);
  }

  function goToPreviousPage() {
    if (!canGoPrevious) return;

    setPageIndex(currentPageIndex - 1);
  }

  function goToNextPage() {
    if (!canGoNext) return;

    setPageIndex(currentPageIndex + 1);
  }

  function goToPage(index: number) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= totalPages) {
      return;
    }

    setPageIndex(index);
  }

  const hasMappings = totalPages > 0;

  return {
    // Selection
    selectedModality,
    selectModality,

    // Available options
    modalities: modalitiesQuery.data ?? EMPTY_MODALITIES,

    // Cohort colors
    cohortColors: metadataQuery.data ?? EMPTY_COLORS,

    // Visualization
    chunks,
    currentChunk,
    hasMappings,

    // Pagination
    currentPage,
    currentPageIndex,
    totalPages,
    canGoPrevious,
    canGoNext,
    goToPreviousPage,
    goToNextPage,
    goToPage,

    // Loading / error states
    isLoadingModalities: modalitiesQuery.isLoading,
    isLoadingMappings: Boolean(selectedModality) && chordQuery.isLoading,
    isFetchingMappings: Boolean(selectedModality) && chordQuery.isFetching,

    // Queries
    modalitiesQuery,
    metadataQuery,
    chordQuery,
  };
}
