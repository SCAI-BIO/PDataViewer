import { api } from "@/lib/api/client";

import type { LongitudinalData } from "./types";

export function fetchLongitudinalVariables(
  signal?: AbortSignal,
): Promise<string[]> {
  return api.get<string[]>("/longitudinal/", { signal });
}

export function fetchLongitudinalData(
  variable: string,
  signal?: AbortSignal,
): Promise<LongitudinalData[]> {
  return api.get<LongitudinalData[]>(
    `/longitudinal/${encodeURIComponent(variable)}`,
    { signal },
  );
}

export function fetchLongitudinalDataForCohort(
  variable: string,
  cohort: string,
  signal?: AbortSignal,
): Promise<LongitudinalData[]> {
  return api.get<LongitudinalData[]>(
    `/longitudinal/${encodeURIComponent(variable)}/${encodeURIComponent(cohort)}`,
    { signal },
  );
}
