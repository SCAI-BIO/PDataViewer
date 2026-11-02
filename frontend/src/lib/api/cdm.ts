import { api } from "@/lib/api/client";

export function fetchVariables(signal?: AbortSignal): Promise<string[]> {
  return api.get<string[]>("/cdm/variables", { signal });
}

export function fetchModalities(signal?: AbortSignal): Promise<string[]> {
  return api.get<string[]>("/cdm/modalities", { signal });
}
