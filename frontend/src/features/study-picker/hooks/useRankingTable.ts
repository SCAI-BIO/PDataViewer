import { useMemo } from "react";
import { useTable } from "@tanstack/react-table";

import type { Metadata } from "@/lib/api/cohorts";

import { rankingColumns, rankingTableFeatures } from "../columns";
import { prepareRankingRows, type RankingRow } from "../utils/ranking";
import type { RankedCohort } from "../types";

export function useRankingTable(
  rankings: readonly RankedCohort[],
  metadata: Metadata,
  submittedVariables: readonly string[],
) {
  const rows: RankingRow[] = useMemo(
    () => prepareRankingRows(rankings, metadata, submittedVariables),
    [rankings, metadata, submittedVariables],
  );

  return useTable({
    features: rankingTableFeatures,
    columns: rankingColumns,
    data: rows,
    getRowId: (row) => row.cohort,
  });
}

export type RankingTableInstance = ReturnType<typeof useRankingTable>;
