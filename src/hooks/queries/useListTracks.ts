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

export function useListTracks() {
  return useQuery<TracksResponse, Error>({
    queryKey: ["tracks"],
    queryFn: fetchTracks,
    // Fail fast so the homepage can fall back to the offline (downloaded-only)
    // view quickly when the server is unreachable, instead of retrying for
    // several seconds. navigator.onLine can't be trusted for this on its own.
    retry: 1,
  });
}
