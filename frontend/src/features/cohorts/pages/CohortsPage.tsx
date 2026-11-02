import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, LayoutGrid, Table2 } from "lucide-react";
import { cn } from "cn";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageHeader, PageLayout } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import type { CohortData } from "@/lib/api/cohorts";

import { CohortCard } from "../components/CohortCard";
import { CohortsTable } from "../components/CohortsTable";
import { useCohortsTable } from "../hooks/useCohortsTable";
import { cohortQueries } from "../queries";

const EMPTY_COHORTS: CohortData[] = [];

export function CohortsPage() {
  const { data, isPending, isError, error, refetch } = useQuery(
    cohortQueries.metadata(),
  );

  const [mobileTableView, setMobileTableView] = useState(false);

  const table = useCohortsTable(data ?? EMPTY_COHORTS);

  const rows = table.getRowModel().rows;
  const sorting = table.state.sorting[0];

  const sortColumn = sorting?.id ?? "cohort";
  const sortDescending = sorting?.desc ?? false;

  const sortableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanSort());

  return (
    <PageLayout>
      <PageHeader title="Cohort Studies">
        Explore the Parkinson&apos;s disease cohorts included in PDataViewer.
        Compare reported participant counts and study characteristics, and
        follow study or publication links for more information.
      </PageHeader>

      {isPending ? (
        <LoadingState message="Loading cohorts..." />
      ) : isError && !data ? (
        <ErrorState
          message={`Could not load cohort data. ${error.message}`}
          onRetry={() => void refetch()}
          className="mx-auto w-full max-w-2xl"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          message="No cohorts available"
          description="No cohort records were returned by the server."
        />
      ) : (
        <section
          aria-label="Cohort overview"
          className="w-full min-w-0 space-y-4"
        >
          {isError && (
            <ErrorState
              message={`Could not refresh cohort data. Displaying previously cached information. ${error.message}`}
              onRetry={() => void refetch()}
            />
          )}

          {/* Mobile sorting and view controls */}
          <div className="flex flex-col gap-3 lg:hidden">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="cohort-sort"
                  className="mb-1 block text-sm font-medium"
                >
                  Sort by
                </label>

                <select
                  id="cohort-sort"
                  value={sortColumn}
                  onChange={(event) =>
                    table.setSorting([
                      {
                        id: event.target.value,
                        desc: sortDescending,
                      },
                    ])
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  {sortableColumns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {typeof column.columnDef.header === "string"
                        ? column.columnDef.header
                        : column.id}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0"
                onClick={() =>
                  table.setSorting([
                    {
                      id: sortColumn,
                      desc: !sortDescending,
                    },
                  ])
                }
                aria-label={`Currently sorting ${
                  sortDescending ? "descending" : "ascending"
                }. Switch to ${sortDescending ? "ascending" : "descending"}.`}
              >
                {sortDescending ? (
                  <ArrowDown data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <ArrowUp data-icon="inline-start" aria-hidden="true" />
                )}
                {sortDescending ? "Descending" : "Ascending"}
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setMobileTableView((current) => !current)}
            >
              {mobileTableView ? (
                <LayoutGrid data-icon="inline-start" aria-hidden="true" />
              ) : (
                <Table2 data-icon="inline-start" aria-hidden="true" />
              )}
              {mobileTableView ? "Show cards" : "Compare in table"}
            </Button>

            {mobileTableView && (
              <p className="text-xs text-muted-foreground">
                Swipe horizontally to compare all columns.
              </p>
            )}
          </div>

          {/* Mobile and tablet cards */}
          {!mobileTableView && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
              {rows.map((row) => (
                <CohortCard key={row.id} cohort={row.original} />
              ))}
            </div>
          )}

          {/* Desktop table / optional mobile comparison */}
          <div
            className={cn(
              "w-full min-w-0",
              mobileTableView ? "block" : "hidden lg:block",
            )}
          >
            <CohortsTable table={table} />
          </div>
        </section>
      )}
    </PageLayout>
  );
}
