import type { Metadata } from "@/lib/api/cohorts";

import type { RankedCohort } from "../types";

export interface RankingRow extends RankedCohort {
  readonly rank: number;
  readonly color: string | null;
  readonly accessLink: string | null;
  readonly availableVariables: readonly string[];
  readonly longitudinalDataAvailable: boolean | null;
}

export function prepareRankingRows(
  rankings: readonly RankedCohort[],
  metadata: Metadata,
  submittedVariables: readonly string[],
): RankingRow[] {
  return rankings.map((ranking, index) => {
    const cohortMetadata = metadata[ranking.cohort];

    const missingVariables = new Set(
      ranking.missing
        .split(", ")
        .map((variable) => variable.trim())
        .filter(Boolean),
    );

    return {
      ...ranking,
      rank: index + 1,
      color: cohortMetadata?.color ?? null,
      accessLink: cohortMetadata?.link ?? null,
      longitudinalDataAvailable:
        cohortMetadata?.longitudinalDataAvailable ?? null,
      availableVariables: submittedVariables.filter(
        (variable) => !missingVariables.has(variable),
      ),
    };
  });
}

export function getLongitudinalHref(row: RankingRow): string | null {
  if (
    row.longitudinalDataAvailable !== true ||
    row.availableVariables.length === 0
  ) {
    return null;
  }

  const params = new URLSearchParams();
  params.set("cohort", row.cohort);

  for (const variable of row.availableVariables) {
    params.append("variables", variable);
  }

  return `/plot-longitudinal?${params.toString()}`;
}
