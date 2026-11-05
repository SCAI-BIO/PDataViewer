import { api } from "@/lib/api/client";

import type { RaceDistributionData } from "./types";

export function fetchRaceCohorts(signal?: AbortSignal): Promise<string[]> {
  return api.get<string[]>("/races/cohorts", { signal });
}

export function fetchRaceDistribution(
  cohorts: readonly string[],
  signal?: AbortSignal,
): Promise<RaceDistributionData[]> {
  const params = new URLSearchParams();
  for (const cohort of cohorts) params.append("cohorts", cohort);

  return api.get<RaceDistributionData[]>(
    `/races/distribution?${params.toString()}`,
    { signal },
  );
}
