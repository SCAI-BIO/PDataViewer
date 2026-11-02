import { api } from "@/lib/api/client";

import type { ChordDiagramData } from "./types";

export function fetchChordDiagram(
  modality: string,
  signal?: AbortSignal,
): Promise<ChordDiagramData> {
  const params = new URLSearchParams({ modality });

  return api.get<ChordDiagramData>(`/visualization/chords/?${params}`, {
    signal,
  });
}
