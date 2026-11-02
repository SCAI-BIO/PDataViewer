import { lazy, Suspense } from "react";
import { Link, useSearchParams } from "react-router";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageHeader, PageLayout } from "@/components/layout/page";
import { formatNumber } from "@/lib/formatters";

import { useCohortLongitudinal } from "../hooks/useCohortLongitudinal";

const LongitudinalChart = lazy(() =>
  import("../components/LongitudinalChart").then((module) => ({
    default: module.LongitudinalChart,
  })),
);

export function CohortLongitudinalPage() {
  const [searchParams] = useSearchParams();
  const cohort = searchParams.get("cohort")?.trim() ?? "";

  const variables = [
    ...new Set(
      searchParams
        .getAll("variables")
        .map((variable) => variable.trim())
        .filter(Boolean),
    ),
  ];

  const {
    series,
    isPending,
    failedVariables,
    unavailableVariables,
    retryFailed,
  } = useCohortLongitudinal(cohort, variables);

  const hasValidParams = Boolean(cohort && variables.length > 0);
  const hasMeasurements = series.some((item) => item.points.length > 0);

  return (
    <PageLayout>
      <PageHeader title="Measurement Availability by Variable">
        Compare longitudinal measurement availability for selected variables
        within a cohort study.
      </PageHeader>

      {!hasValidParams ? (
        <EmptyState
          message="No cohort or variables selected"
          description="Select a cohort and at least one variable in Study Picker to explore longitudinal measurement availability."
          className="mx-auto max-w-xl"
          action={
            <Link
              to="/study-picker"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Choose different variables
            </Link>
          }
        />
      ) : (
        <>
          {/* Selected cohort and variables */}
          <section
            aria-label="Selected study information"
            className="mx-auto w-full max-w-2xl space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Cohort: <strong className="text-foreground">{cohort}</strong>
            </p>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                Selected variables ({formatNumber(variables.length)})
              </summary>

              <ul className="mt-3 flex flex-wrap gap-2">
                {variables.map((variable) => (
                  <li
                    key={variable}
                    className="max-w-full rounded-md bg-muted px-3 py-1.5 text-xs font-medium wrap-anywhere"
                  >
                    {variable}
                  </li>
                ))}
              </ul>
            </details>
          </section>

          {isPending ? (
            <LoadingState message="Loading longitudinal measurements..." />
          ) : (
            <section
              aria-label="Longitudinal measurement results"
              className="w-full min-w-0 space-y-5"
            >
              {failedVariables.length > 0 && (
                <ErrorState
                  message={`Some variables could not be loaded (${formatNumber(failedVariables.length)}).`}
                  onRetry={retryFailed}
                  retryLabel="Retry failed requests"
                  className="bg-destructive/5"
                >
                  <ul className="list-inside list-disc space-y-1">
                    {failedVariables.map(({ variable, message }) => (
                      <li key={variable} className="wrap-anywhere">
                        <strong>{variable}:</strong> {message}
                      </li>
                    ))}
                  </ul>
                </ErrorState>
              )}

              {unavailableVariables.length > 0 && hasMeasurements && (
                <output className="block rounded-lg border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                  No usable measurements were found for:{" "}
                  {unavailableVariables.join(", ")}.
                </output>
              )}

              {hasMeasurements ? (
                <Suspense
                  fallback={<LoadingState message="Loading visualization..." />}
                >
                  <LongitudinalChart
                    title={`Measurement availability — ${cohort}`}
                    series={series}
                    seriesType="variable"
                  />
                </Suspense>
              ) : (
                <EmptyState
                  message="No measurements to visualize"
                  description={
                    failedVariables.length > 0
                      ? "None of the selected variables could be loaded successfully. Use the retry action above to try again."
                      : "No usable longitudinal measurements were found for the selected cohort and variables."
                  }
                />
              )}
            </section>
          )}
        </>
      )}
    </PageLayout>
  );
}
