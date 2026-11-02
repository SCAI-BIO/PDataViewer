import { api } from "@/lib/api/client";

export interface CohortMetadata {
  readonly participants: number | null;
  readonly controlParticipants: number | null;
  readonly prodromalParticipants: number | null;
  readonly pdParticipants: number | null;
  readonly longitudinalParticipants: number | null;
  readonly longitudinalDataAvailable: boolean;
  readonly followUpInterval: string | null;
  readonly location: string | null;
  readonly doi: string | null;
  readonly link: string | null;
  readonly color: string;
}

export interface CohortData extends CohortMetadata {
  readonly cohort: string;
}

export type Metadata = Readonly<Record<string, CohortMetadata>>;

export function fetchCohorts(signal?: AbortSignal): Promise<string[]> {
  return api.get<string[]>("/cohorts/", { signal });
}

export function fetchMetadata(signal?: AbortSignal): Promise<Metadata> {
  return api.get<Metadata>("/cohorts/metadata", { signal });
}
