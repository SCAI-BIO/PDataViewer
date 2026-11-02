import { CheckCircle2, ChevronDown } from "lucide-react";

import { DataAccessAction, LongitudinalAction } from "./RankingActions";
import type { RankingRow } from "../utils/ranking";

interface RankingCardProps {
  row: RankingRow;
}

export function RankingCard({ row }: RankingCardProps) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <header className="flex items-center gap-3 p-4">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary tabular-nums"
          aria-label={`Rank ${row.rank}`}
        >
          {row.rank}
        </span>

        {row.color && (
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: row.color }}
            aria-hidden="true"
          />
        )}

        <h3 className="min-w-0 text-lg font-semibold wrap-break-word">
          {row.cohort}
        </h3>
      </header>

      <div className="border-y bg-muted/30 px-4 py-4">
        <p className="mb-1 text-xs text-muted-foreground">Variable matched</p>

        <p className="text-xl font-bold text-primary tabular-nums">
          {row.found}
        </p>
      </div>

      {row.missing ? (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-sm px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            Missing variables
            <ChevronDown
              className="size-4 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>

          <div className="border-t px-4 py-3">
            <p className="min-w-0 whitespace-normal wrap-anywhere text-sm leading-relaxed text-muted-foreground">
              {row.missing}
            </p>
          </div>
        </details>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          All selected variables found
        </div>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t p-4">
        <LongitudinalAction row={row} />
        <DataAccessAction row={row} />
      </footer>
    </article>
  );
}
