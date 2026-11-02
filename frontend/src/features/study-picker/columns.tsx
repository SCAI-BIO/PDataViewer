import { createColumnHelper, tableFeatures } from "@tanstack/react-table";
import { CheckCircle2 } from "lucide-react";

import {
  DataAccessAction,
  LongitudinalAction,
} from "./components/RankingActions";
import type { RankingRow } from "./utils/ranking";

export const rankingTableFeatures = tableFeatures({});

const columnHelper = createColumnHelper<
  typeof rankingTableFeatures,
  RankingRow
>();

export const rankingColumns = columnHelper.columns([
  columnHelper.accessor("cohort", {
    header: "Cohort (Ranked)",
    cell: ({ row }) => {
      const { cohort, rank, color } = row.original;

      return (
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums">
            {rank}
          </span>

          {color && (
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          )}

          <span className="font-semibold wrap-break-word">{cohort}</span>
        </div>
      );
    },
  }),

  columnHelper.accessor("found", {
    header: "Variable Match",
    cell: ({ getValue }) => (
      <span className="inline-flex whitespace-nowrap rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary tabular-nums">
        {getValue()}
      </span>
    ),
  }),

  columnHelper.accessor("missing", {
    header: "Missing Variables",
    cell: ({ getValue }) => {
      const missing = getValue();

      return missing ? (
        <span className="block min-w-0 max-w-full whitespace-normal wrap-anywhere text-sm loading-relaxed">
          {missing}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          All found
        </span>
      );
    },
  }),

  columnHelper.display({
    id: "longitudinal",
    header: "Longitudinal",
    cell: ({ row }) => <LongitudinalAction row={row.original} />,
  }),

  columnHelper.display({
    id: "dataAccess",
    header: "Data Access",
    cell: ({ row }) => <DataAccessAction row={row.original} />,
  }),
]);
