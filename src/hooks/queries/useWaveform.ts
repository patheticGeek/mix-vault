"use client";

import { getOfflineWaveform } from "@/lib/offline/downloads";
import { apiClient } from "@/lib/api-client";
import { parsePeaks } from "@/lib/waveform";
import { useQuery } from "@tanstack/react-query";

const waveformEndpoint = apiClient.api.tracks[":id"].waveform.$get;

// The waveform is fetched on its own — the list and single-track endpoints no
// longer carry the (heavy) peak data. Returns the parsed 0..1 amplitudes,
// or an empty array while loading, so callers can render peaks directly.
// Falls back to the copy stored with a downloaded track, so the bars still
// render when the network fetch fails (offline) or the track is gone.
async function fetchWaveform(id: string): Promise<number[]> {
  try {
    const res = await waveformEndpoint({ param: { id } });
    if (res.ok) {
      const { waveformPreview } = await res.json();
      return parsePeaks(waveformPreview);
    }
  } catch {
    // network unavailable — fall through to the offline copy
  }
  const offline = await getOfflineWaveform(id);
  if (offline) return offline;
  throw new Error("Failed to fetch waveform");
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
