"use client";

import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

type TracksResponse = InferResponseType<typeof apiClient.api.tracks.$get, 200>;
export type TrackSummary = TracksResponse[number];

// "public" (the default) lists only public tracks — this is what the homepage
// shows. "all" also includes unlisted/private tracks, but the server only
// honors it for a logged-in request, so it's for the admin views.
type ListScope = "public" | "all";

async function fetchTracks(scope: ListScope): Promise<TracksResponse> {
  const res = await apiClient.api.tracks.$get({ query: { scope } });
  if (!res.ok) {
    throw new Error("Failed to fetch tracks");
  }
  return res.json();
}

export function useListTracks(scope: ListScope = "public") {
  return useQuery<TracksResponse, Error>({
    queryKey: ["tracks", { scope }],
    queryFn: () => fetchTracks(scope),
    // Fail fast so the homepage can fall back to the offline (downloaded-only)
    // view quickly when the server is unreachable, instead of retrying for
    // several seconds. navigator.onLine can't be trusted for this on its own.
    retry: 1,
  });
}
