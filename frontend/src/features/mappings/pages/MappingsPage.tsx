import { lazy, Suspense } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Info } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageHeader, PageLayout, PageSection } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/formatters";

import { ModalitySelector } from "../components/ModalitySelector";
import { useMappings } from "../hooks/useMappings";

const ChordDiagram = lazy(() =>
  import("../components/ChordDiagram").then((module) => ({
    default: module.ChordDiagram,
  })),
);

const PASSIONATE_URL = "https://zenodo.org/records/10218362";

export function MappingsPage() {
  const {
    selectedModality,
    selectModality,
    modalities,
    cohortColors,
    currentChunk,
    currentPage,
    currentPageIndex,
    totalPages,
    canGoPrevious,
    canGoNext,
    goToPreviousPage,
    goToNextPage,
    hasMappings,
    isLoadingMappings,
    isFetchingMappings,
    modalitiesQuery,
    metadataQuery,
    chordQuery,
  } = useMappings();

  const hasSelectedModality = selectedModality.length > 0;
  const hasChordData = chordQuery.data !== undefined;

  return (
    <PageLayout>
      <PageHeader title="Variable Mappings">
        Explore semantic connections between variables across Parkinson&apos;s
        disease cohort studies.
      </PageHeader>

      {/* Mapping schema reference */}
      <aside className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-lg border bg-muted/30 p-4">
        <Info
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />

        <div className="min-w-0 space-y-2">
          <p className="text-sm leading-6 text-muted-foreground">
            The Parkinson's Disease Variable Mapping Schema (PASSIONATE) is
            available on Zenodo.
          </p>

          <a
            href={PASSIONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            View mapping schema
            <ExternalLink className="size-4" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </aside>

      {/* Step 1: Modality selection */}
      <PageSection
        id="mappings-modality-heading"
        title="Select a modality"
        width="full"
      >
        {modalitiesQuery.isError && (
          <ErrorState
            message={
              modalitiesQuery.data === undefined
                ? `Could not load available modalities. ${modalitiesQuery.error.message}`
                : "Could not refresh modalities. Previously loaded options remain available."
            }
            onRetry={() => void modalitiesQuery.refetch()}
          />
        )}

        {modalitiesQuery.isLoading ? (
          <LoadingState message="Loading modalities..." />
        ) : modalities.length > 0 ? (
          <ModalitySelector
            modalities={modalities}
            value={selectedModality}
            onValueChange={selectModality}
          />
        ) : (
          !modalitiesQuery.isError && (
            <EmptyState
              message="No modalities available"
              description="The server did not return any data modalities."
            />
          )
        )}
      </PageSection>

      {/* Results are only shown after selecting a modality */}
      {hasSelectedModality && (
        <>
          {/* Initial request failure or background refresh failure */}
          {chordQuery.isError && (
            <ErrorState
              message={
                hasChordData
                  ? `Could not refresh mappings for ${selectedModality}. Previously loaded results are still displayed.`
                  : `Could not load mappings for ${selectedModality}. ${chordQuery.error.message}`
              }
              onRetry={() => void chordQuery.refetch()}
              className="mx-auto w-full max-w-2xl"
            />
          )}

          {isLoadingMappings ? (
            <LoadingState message="Loading variable mappings..." />
          ) : (
            hasChordData && (
              <>
                {/* Explain limitations in the returned mapping data */}

                {/* Step 2: Chord diagram */}
                {hasMappings && currentChunk ? (
                  <PageSection
                    id="mappings-diagram-heading"
                    title={`${selectedModality} mappings`}
                    width="full"
                  >
                    {metadataQuery.isError && (
                      <p className="text-sm text-muted-foreground">
                        Cohort colors could not be loaded. Default visualization
                        colors will be used.
                      </p>
                    )}

                    {isFetchingMappings && (
                      <output className="block text-center text-sm text-muted-foreground">
                        Updating mappings...
                      </output>
                    )}

                    {/* Diagram pagination */}
                    {totalPages > 1 && (
                      <nav
                        aria-label="Mapping diagram pagination"
                        className="flex flex-wrap items-center justify-center gap-3"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={!canGoPrevious}
                          aria-label="Previous diagram"
                          onClick={goToPreviousPage}
                        >
                          <ChevronLeft className="size-4" aria-hidden="true" />
                        </Button>

                        <span
                          aria-live="polite"
                          className="min-w-30 text-center text-sm font-medium tabular-nums"
                        >
                          Page {formatNumber(currentPage)} of{" "}
                          {formatNumber(totalPages)}
                        </span>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={!canGoNext}
                          aria-label="Next diagram"
                          onClick={goToNextPage}
                        >
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </Button>
                      </nav>
                    )}

                    <Suspense
                      fallback={
                        <LoadingState message="Loading chord diagram..." />
                      }
                    >
                      <ChordDiagram
                        key={`${selectedModality}:${currentPageIndex}`}
                        chunk={currentChunk}
                        colors={cohortColors}
                        title={`${selectedModality} variable mappings`}
                      />
                    </Suspense>
                  </PageSection>
                ) : (
                  <EmptyState
                    message="No mappings available"
                    description={`No cross-cohort variable mappings were found for ${selectedModality}. Try another modality.`}
                    className="mx-auto max-w-2xl"
                  />
                )}
              </>
            )
          )}
        </>
      )}
    </PageLayout>
  );
}
