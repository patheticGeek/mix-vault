"use client";

import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

const trackEndpoint = apiClient.api.tracks[":id"].$get;

export type TrackResponse = InferResponseType<typeof trackEndpoint, 200>;

async function fetchTrack(id: string): Promise<TrackResponse> {
  const res = await trackEndpoint({ param: { id } });
  if (!res.ok) {
    throw new Error("Failed to fetch track");
  }
  return res.json();
}

export function useTrack(id: string) {
  return useQuery<TrackResponse, Error>({
    queryKey: ["tracks", id],
    queryFn: () => fetchTrack(id),
    enabled: Boolean(id),
  });
}
