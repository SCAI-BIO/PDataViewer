import { useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/button";
import type { Metadata } from "@/lib/api/cohorts";

import { useRankingTable } from "../hooks/useRankingTable";
import type { RankedCohort } from "../types";
import { RankingCard } from "./RankingCard";
import { RankingTable } from "./RankingTable";

interface RankingResultsProps {
  rankings: readonly RankedCohort[];
  metadata: Metadata;
  submittedVariables: readonly string[];
}

export function RankingResults({
  rankings,
  metadata,
  submittedVariables,
}: RankingResultsProps) {
  const [showMobileTable, setShowMobileTable] = useState(false);

  const table = useRankingTable(rankings, metadata, submittedVariables);
  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return (
      <EmptyState
        message="No matching cohorts found"
        description="None of the available cohorts match your selected variables. Try selecting different variables and ranking again."
      />
    );
  }

  return (
    <section
      aria-labelledby="ranking-results-heading"
      className="w-full min-w-0 space-y-5"
    >
      {/* Results heading */}
      <div className="space-y-1.5">
        <h2
          id="ranking-results-heading"
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          Ranked cohorts
        </h2>

        <p className="text-sm leading-6 text-muted-foreground">
          Cohorts are ranked by how many of your selected variables they
          contain.
        </p>
      </div>

      {/* Mobile view controls */}
      <div className="flex flex-col gap-2 lg:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowMobileTable((current) => !current)}
        >
          {showMobileTable ? (
            <LayoutGrid data-icon="inline-start" aria-hidden="true" />
          ) : (
            <Table2 data-icon="inline-start" aria-hidden="true" />
          )}

          {showMobileTable ? "Show cards" : "Compare in table"}
        </Button>

        {showMobileTable && (
          <p className="text-xs text-muted-foreground">
            Swipe horizontally to see all columns.
          </p>
        )}
      </div>

      {/* Mobile and tablet cards */}
      <div
        className={
          showMobileTable
            ? "hidden"
            : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden"
        }
      >
        {rows.map((row) => (
          <RankingCard key={row.id} row={row.original} />
        ))}
      </div>

      {/* Desktop table / optional mobile comparison */}
      <div className={showMobileTable ? "min-w-0" : "hidden min-w-0 lg:block"}>
        <RankingTable table={table} />
      </div>
    </section>
  );
}
