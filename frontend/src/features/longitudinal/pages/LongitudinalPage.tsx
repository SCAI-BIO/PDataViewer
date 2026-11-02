import { lazy, Suspense } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageHeader, PageLayout, PageSection } from "@/components/layout/page";

import { VariableSelector } from "../components/VariableSelector";
import { useLongitudinal } from "../hooks/useLongitudinal";

const LongitudinalChart = lazy(() =>
  import("../components/LongitudinalChart").then((module) => ({
    default: module.LongitudinalChart,
  })),
);

export function LongitudinalPage() {
  const {
    selectedVariable,
    setUserSelection,
    variables,
    colors,
    variablesQuery,
    measurementsQuery,
    metadataQuery,
  } = useLongitudinal();

  const series = measurementsQuery.data ?? [];

  const hasMeasurements = series.some((item) => item.points.length > 0);

  return (
    <PageLayout>
      <PageHeader title="Longitudinal Measurement Availability">
        Explore how measurement availability changes across follow-up visits for
        a selected variable in different cohort studies.
      </PageHeader>

      {/* Variable selection */}
      <PageSection
        id="variable-selection-heading"
        title="Select a longitudinal variable"
      >
        {variablesQuery.isError && (
          <ErrorState
            message={
              variablesQuery.data === undefined
                ? `Could not load longitudinal variables. ${variablesQuery.error.message}`
                : "Could not refresh the variable list. Previously loaded options remain available."
            }
            onRetry={() => void variablesQuery.refetch()}
          />
        )}

        <VariableSelector
          variables={variables}
          value={selectedVariable}
          onValueChange={setUserSelection}
          isLoading={variablesQuery.isLoading}
          disabled={variablesQuery.isError && variablesQuery.data === undefined}
        />
      </PageSection>

      {/* Visualization */}
      {selectedVariable && (
        <section
          aria-label="Longitudinal visualization"
          aria-busy={measurementsQuery.isLoading}
          className="w-full min-w-0"
        >
          {measurementsQuery.isLoading ? (
            <LoadingState message="Loading longitudinal measurements..." />
          ) : measurementsQuery.isError &&
            measurementsQuery.data === undefined ? (
            <ErrorState
              message={`Failed to load measurements for ${selectedVariable}. ${measurementsQuery.error.message}`}
              onRetry={() => void measurementsQuery.refetch()}
            />
          ) : hasMeasurements ? (
            <div className="w-full min-w-0 space-y-4">
              {metadataQuery.isError && (
                <p className="text-sm text-muted-foreground">
                  Cohort colors could not be loaded. Using the default chart
                  palette.
                </p>
              )}

              {measurementsQuery.isError && (
                <ErrorState
                  message="Could not refresh measurements. Displaying previously cached data."
                  onRetry={() => void measurementsQuery.refetch()}
                  retryLabel="Retry refresh"
                />
              )}

              <Suspense
                fallback={<LoadingState message="Loading visualization..." />}
              >
                <LongitudinalChart
                  title={`Measurement availability: ${selectedVariable}`}
                  series={series}
                  colors={colors}
                />
              </Suspense>
            </div>
          ) : (
            <EmptyState
              message="No longitudinal measurements available"
              description={
                <>
                  No usable longitudinal measurements were found for{" "}
                  <strong className="text-foreground">
                    {selectedVariable}
                  </strong>
                  . Try selecting another variable.
                </>
              }
            />
          )}
        </section>
      )}
    </PageLayout>
  );
}
