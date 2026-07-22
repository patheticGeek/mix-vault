"use client";

import { apiClient } from "@/lib/api-client";
import { parsePeaks } from "@/lib/waveform";
import { useQuery } from "@tanstack/react-query";

const waveformEndpoint = apiClient.api.tracks[":id"].waveform.$get;

// The waveform is fetched on its own — the list and single-track endpoints no
// longer carry the (heavy) peak data. Returns the parsed 0..1 amplitudes,
// or an empty array while loading, so callers can render peaks directly.
async function fetchWaveform(id: string): Promise<number[]> {
  const res = await waveformEndpoint({ param: { id } });
  if (!res.ok) {
    throw new Error("Failed to fetch waveform");
  }
  const { waveformPreview } = await res.json();
  return parsePeaks(waveformPreview);
}

export function useWaveform(id: string | undefined) {
  return useQuery<number[], Error>({
    queryKey: ["tracks", id, "waveform"],
    queryFn: () => fetchWaveform(id!),
    enabled: Boolean(id),
    // Waveforms never change for a given track, so keep them cached across the
    // session rather than refetching on every remount.
    staleTime: Infinity,
  });
}
