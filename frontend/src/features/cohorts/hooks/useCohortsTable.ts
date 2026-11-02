import { useTable } from "@tanstack/react-table";

import type { CohortData } from "@/lib/api/cohorts";
import { cohortColumns, cohortTableFeatures } from "../columns";

export function useCohortsTable(data: CohortData[]) {
  return useTable({
    features: cohortTableFeatures,
    columns: cohortColumns,
    data,
    getRowId: (row) => row.cohort,
    initialState: {
      sorting: [{ id: "cohort", desc: false }],
    },
    enableSortingRemoval: false,
    enableMultiSort: false,
    sortDescFirst: false,
  });
}
