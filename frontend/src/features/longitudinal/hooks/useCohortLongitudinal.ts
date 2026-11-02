import { useQueries } from "@tanstack/react-query";

import { longitudinalQueries } from "../queries";
import {
  createRetentionSeries,
  type RetentionSeries,
} from "../utils/retention";

interface VariableError {
  variable: string;
  message: string;
}

export function useCohortLongitudinal(
  cohort: string,
  variables: readonly string[],
) {
  const results = useQueries({
    queries: cohort
      ? variables.map((variable) =>
          longitudinalQueries.byCohort(variable, cohort),
        )
      : [],
  });

  const series: RetentionSeries[] = [];
  const failedVariables: VariableError[] = [];
  const unavailableVariables: string[] = [];

  for (const [index, result] of results.entries()) {
    const variable = variables[index];
    if (!variable) continue;

    if (result.isError) {
      failedVariables.push({
        variable,
        message: result.error.message,
      });
    }

    if (result.data) {
      const prepared = createRetentionSeries(variable, result.data);

      if (prepared.points.some((point) => point.retentionPercent !== null)) {
        series.push(prepared);
      } else {
        unavailableVariables.push(variable);
      }
    }
  }

  const isPending = results.some((result) => result.isPending);

  function retryFailed() {
    for (const result of results) {
      if (result.isError) {
        void result.refetch();
      }
    }
  }

  return {
    series,
    isPending,
    failedVariables,
    unavailableVariables,
    retryFailed,
  };
}
