import { ListOrdered, RefreshCw } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { PageHeader, PageLayout, PageSection } from "@/components/layout/page";

import { RankingResults } from "../components/RankingResults";
import { VariableMultiSelect } from "../components/VariableMultiSelect";
import { useStudyPicker } from "../hooks/useStudyPicker";

export function StudyPickerPage() {
  const {
    selectedVariables,
    submittedVariables,
    updateSelectedVariables,
    availableVariables,
    metadata,
    rankings,
    canRank,
    hasSubmitted,
    isRanking,
    submitRanking,
    variablesQuery,
    metadataQuery,
    rankingQuery,
  } = useStudyPicker();

  return (
    <PageLayout>
      <PageHeader title="Study Picker">
        Find cohort datasets that match your research needs. Select variables of
        interest to receive a ranked list of available cohorts. You can also
        explore longitudinal measurement availability across study visits.
      </PageHeader>

      <PageSection
        id="variable-selection-heading"
        title="Select variables of interest"
        width="full"
      >
        {variablesQuery.isError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4"
          >
            <p className="text-sm text-destructive">
              Could not load available variables. {variablesQuery.error.message}
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void variablesQuery.refetch()}
            >
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              Retry
            </Button>
          </div>
        )}

        <VariableMultiSelect
          variables={availableVariables}
          selectedVariables={selectedVariables}
          onSelectionChange={updateSelectedVariables}
          isLoading={variablesQuery.isPending}
          disabled={variablesQuery.isError}
        />

        <div className="flex justify-center">
          <Button type="button" disabled={!canRank} onClick={submitRanking}>
            {isRanking ? (
              <LoadingState message="Ranking cohorts..." />
            ) : (
              <>
                <ListOrdered data-icon="inline-start" aria-hidden="true" />
                Rank cohorts
              </>
            )}
          </Button>
        </div>
      </PageSection>

      {hasSubmitted && (
        <section
          aria-label="Cohort ranking results"
          className="w-full min-w-0 space-y-5"
        >
          {rankingQuery.isLoading && (
            <LoadingState message="Calculating cohort rankings..." />
          )}

          {rankingQuery.isError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4"
            >
              <p className="text-sm text-destructive">
                Could not retrieve cohort rankings. {rankingQuery.error.message}
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void rankingQuery.refetch()}
              >
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                Retry
              </Button>
            </div>
          )}

          {metadataQuery.isError && (
            <p className="text-sm text-muted-foreground">
              Cohort metadata could not be loaded. Some colors and data-access
              links may be unavailable.
            </p>
          )}

          {rankingQuery.data !== undefined &&
            (rankings.length === 0 ? (
              <EmptyState
                message="No matching cohorts found"
                description="None of the available cohorts contain the selected variables. Try choosing different variables and ranking again."
              />
            ) : (
              <RankingResults
                rankings={rankings}
                metadata={metadata}
                submittedVariables={submittedVariables}
              />
            ))}
        </section>
      )}
    </PageLayout>
  );
}
