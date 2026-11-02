import { api } from "@/lib/api/client";

import type { RankedCohort } from "./types";

export function fetchStudyPickerVariables(signal?: AbortSignal): Promise<string[]> {
  return api.get<string[]>("/study-picker/variables", { signal });
}

export function rankCohorts(
  variables: readonly string[],
  signal?: AbortSignal,
): Promise<RankedCohort[]> {
  const selectedVariables = [
    ...new Set(variables.map((variable) => variable.trim()).filter(Boolean)),
  ];

  if (selectedVariables.length === 0) {
    throw new Error("Select at least one variable to rank cohorts.");
  }

  return api.post<RankedCohort[]>("study-picker/rank", selectedVariables, {
    signal,
  });
}
