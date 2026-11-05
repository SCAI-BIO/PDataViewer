import { lazy, Suspense } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { SingleSelectCombobox } from "@/components/forms/SingleSelectCombobox";
import { PageHeader, PageLayout, PageSection } from "@/components/layout/page";

import { useRaceDistribution } from "../hooks/useRaceDistribution";

const RaceDistributionChart = lazy(() =>
  import("../components/RaceDistributionChart").then((module) => ({
    default: module.RaceDistributionChart,
  })),
);

export function RaceDistributionPage() {
  const {
    availableCohorts,
    selectedCohort,
    selectCohort,
    cohortsQuery,
    distributionQuery,
  } = useRaceDistribution();

  const distribution = distributionQuery.data ?? [];
  const hasSelections = distribution.some((row) => row.value > 0);

  return (
    <PageLayout>
      <PageHeader title="Race Distribution">
        Explore recorded race selections across Parkinson&apos;s disease
        cohorts. Filter by study to examine the distribution of selected race
        categories.
      </PageHeader>

      <PageSection id="race-cohorts-heading" title="Select a cohort">
        {cohortsQuery.isError && (
          <ErrorState
            message={
              cohortsQuery.data === undefined
                ? `Could not load cohorts with race data. ${cohortsQuery.error.message}`
                : "Could not refresh available cohorts. Showing previously loaded options."
            }
            onRetry={() => void cohortsQuery.refetch()}
          />
        )}

        {cohortsQuery.isLoading ? (
          <LoadingState message="Loading cohorts with race data..." />
        ) : availableCohorts.length > 0 ? (
          <SingleSelectCombobox
            id="race-cohort-selection"
            label="Cohort"
            hideLabel
            items={availableCohorts}
            value={selectedCohort}
            onValueChange={selectCohort}
            placeholder="All cohorts"
            description="All cohorts are displayed by default. Select a cohort to filter the chart, or clear the selection to show all cohorts."
          />
        ) : (
          !cohortsQuery.isError && (
            <EmptyState
              message="No race data available"
              description="Import cohort race counts to enable this visualization."
            />
          )
        )}
      </PageSection>

      {availableCohorts.length > 0 && (
        <PageSection
          id="race-distribution-heading"
          title="Selection distribution"
          width="full"
          description="Shares are calculated from selected race responses, not unique participants."
        >
          {hasSelections ? (
            <div className="space-y-4">
              {distributionQuery.isError && (
                <ErrorState
                  message="Could not refresh race distribution. Showing cached data."
                  onRetry={() => void distributionQuery.refetch()}
                  retryLabel="Retry refresh"
                />
              )}
              {distributionQuery.isFetching && (
                <output className="block text-center text-sm text-muted-foreground">
                  Updating race distribution...
                </output>
              )}
              <Suspense fallback={<LoadingState message="Loading chart..." />}>
                <RaceDistributionChart
                  data={distribution}
                  cohortCount={selectedCohort ? 1 : availableCohorts.length}
                />
              </Suspense>
            </div>
          ) : (
            <EmptyState
              message="No race selections found"
              description="The selected cohorts do not contain any positive race selections."
            />
          )}
        </PageSection>
      )}
    </PageLayout>
  );
}
