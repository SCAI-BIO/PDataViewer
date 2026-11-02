import { lazy, Suspense } from "react";

import { ColorIndicator } from "@/components/data-display/ColorIndicator";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageHeader, PageLayout, PageSection } from "@/components/layout/page";
import { formatNumber } from "@/lib/formatters";

import { BiomarkerSelector } from "../components/BiomarkerSelector";
import { DiagnosisGroupSelector } from "../components/DiagnosisGroupSelector";
import { useBiomarkers } from "../hooks/useBiomarkers";

const BiomarkerBoxplot = lazy(async () => {
  const module = await import("../components/BiomarkerBoxplot");
  return { default: module.BiomarkerBoxplot };
});

export function BiomarkersPage() {
  const {
    selectedBiomarker,
    selectBiomarker,
    availableBiomarkers,
    biomarkersQuery,
    selectedDiagnosisLabels,
    updateSelectedDiagnosisLabels,
    availableDiagnosisLabels,
    cohortsQuery,
    diagnosesQuery,
    metadataQuery,
    cohortColors,
    isLoadingDiagnosisOptions,
    distributions,
    isLoadingMeasurements,
    isFetchingMeasurements,
    failedGroups,
    unavailableGroups,
    retryFailedMeasurements,
  } = useBiomarkers();

  const hasSelectedGroups = selectedDiagnosisLabels.length > 0;

  // Preserve cached cohort data if a background refetch fails.
  const canShowDiagnosisStep = (cohortsQuery.data?.length ?? 0) > 0;

  return (
    <PageLayout>
      <PageHeader title="Biomarkers">
        Compare biomarker measurements across Parkinson&apos;s disease cohorts
        and diagnosis groups using interactive boxplots.
      </PageHeader>

      {/* Step 1: Biomarker selection */}
      <PageSection id="biomarker-selection-heading" title="Select a biomarker">
        {biomarkersQuery.isError && (
          <ErrorState
            message={`Could not load available biomarkers. ${biomarkersQuery.error.message}`}
            onRetry={() => void biomarkersQuery.refetch()}
          />
        )}

        <BiomarkerSelector
          biomarkers={availableBiomarkers}
          value={selectedBiomarker}
          onValueChange={selectBiomarker}
          isLoading={biomarkersQuery.isLoading}
          disabled={
            biomarkersQuery.isError && biomarkersQuery.data === undefined
          }
        />
      </PageSection>

      {selectedBiomarker && (
        <>
          {/* Step 2: Available cohorts */}
          <PageSection
            id="biomarker-cohorts-heading"
            title="Cohorts with measurements"
          >
            {cohortsQuery.isError && (
              <ErrorState
                message={`Could not load cohort information for ${selectedBiomarker}. ${cohortsQuery.error.message}`}
                onRetry={() => void cohortsQuery.refetch()}
              />
            )}

            {cohortsQuery.isLoading ? (
              <LoadingState message="Loading available cohorts..." />
            ) : cohortsQuery.data?.length ? (
              <>
                <ul className="flex flex-wrap gap-2">
                  {cohortsQuery.data.map((cohort) => (
                    <li
                      key={cohort}
                      className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-sm"
                    >
                      {cohortColors[cohort] && (
                        <ColorIndicator color={cohortColors[cohort]} />
                      )}
                      {cohort}
                    </li>
                  ))}
                </ul>

                {metadataQuery.isError && (
                  <p className="text-sm text-muted-foreground">
                    Cohort metadata could not be loaded. Default chart colors
                    will be used.
                  </p>
                )}
              </>
            ) : (
              !cohortsQuery.isError && (
                <EmptyState
                  message="No cohorts available"
                  description={`No cohorts containing measurements for ${selectedBiomarker} were found.`}
                  className="py-6"
                />
              )
            )}
          </PageSection>

          {/* Step 3: Diagnosis group selection */}
          {canShowDiagnosisStep && (
            <PageSection
              id="diagnosis-selection-heading"
              title="Select groups to compare"
            >
              {diagnosesQuery.isError && (
                <ErrorState
                  message={`Could not load diagnosis options for ${selectedBiomarker}. ${diagnosesQuery.error.message}`}
                  onRetry={() => void diagnosesQuery.refetch()}
                />
              )}

              {(!diagnosesQuery.isError ||
                diagnosesQuery.data !== undefined) && (
                <>
                  <DiagnosisGroupSelector
                    options={availableDiagnosisLabels}
                    selectedGroups={selectedDiagnosisLabels}
                    onSelectionChange={updateSelectedDiagnosisLabels}
                    isLoading={isLoadingDiagnosisOptions}
                    disabled={
                      isLoadingDiagnosisOptions ||
                      availableDiagnosisLabels.length === 0
                    }
                  />

                  {!isLoadingDiagnosisOptions &&
                    !cohortsQuery.isError &&
                    !diagnosesQuery.isError &&
                    availableDiagnosisLabels.length === 0 && (
                      <EmptyState
                        message="No diagnosis groups available"
                        description="No selectable cohort and diagnosis combinations were found for this biomarker."
                        className="py-6"
                      />
                    )}
                </>
              )}
            </PageSection>
          )}

          {/* Step 4: Visualization */}
          {hasSelectedGroups && (
            <PageSection
              id="biomarker-visualization-heading"
              title="Distribution comparison"
              width="full"
            >
              {isLoadingMeasurements && (
                <LoadingState message="Loading biomarker measurements..." />
              )}

              {isFetchingMeasurements && !isLoadingMeasurements && (
                <output className="block text-center text-sm text-muted-foreground">
                  Updating measurements...
                </output>
              )}

              {failedGroups.length > 0 && (
                <ErrorState
                  message={`Failed to load ${formatNumber(failedGroups.length)} ${
                    failedGroups.length === 1 ? "group" : "groups"
                  }.`}
                  onRetry={retryFailedMeasurements}
                  retryLabel="Retry failed groups"
                >
                  <ul className="list-inside list-disc space-y-1">
                    {failedGroups.map(({ label, message }) => (
                      <li key={label} className="wrap-anywhere">
                        <strong>{label}:</strong> {message}
                      </li>
                    ))}
                  </ul>
                </ErrorState>
              )}

              {unavailableGroups.length > 0 && distributions.length > 0 && (
                <p className="text-sm leading-6 text-muted-foreground">
                  No valid numerical measurements were returned for:{" "}
                  {unavailableGroups.join(", ")}.
                </p>
              )}

              {distributions.length > 0 ? (
                <Suspense
                  fallback={<LoadingState message="Loading visualization..." />}
                >
                  <BiomarkerBoxplot
                    title={selectedBiomarker}
                    distributions={distributions}
                    colors={cohortColors}
                  />
                </Suspense>
              ) : (
                !isLoadingMeasurements &&
                failedGroups.length === 0 && (
                  <EmptyState
                    message="No biomarker measurements to visualize"
                    description="The selected groups did not return usable numerical measurements. Try selecting different diagnosis groups."
                  />
                )
              )}
            </PageSection>
          )}
        </>
      )}
    </PageLayout>
  );
}
