"use client";

import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

type TracksResponse = InferResponseType<typeof apiClient.api.tracks.$get>;
export type TrackSummary = TracksResponse[number];

async function fetchTracks(): Promise<TracksResponse> {
  const res = await apiClient.api.tracks.$get();
  if (!res.ok) {
    throw new Error("Failed to fetch tracks");
  }
  return res.json();
}

// initialData lets the homepage hand off the handful of tracks it already
// server-rendered; initialDataUpdatedAt: 0 marks that data as maximally
// stale so react-query still fetches the full list on mount instead of
// treating the partial SSR data as good enough.
export function useListTracks(initialData?: TracksResponse) {
  return useQuery<TracksResponse, Error>({
    queryKey: ["tracks"],
    queryFn: fetchTracks,
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
  });
}
