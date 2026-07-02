"use client";

import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

type TracksResponse = InferResponseType<typeof apiClient.api.tracks.$get>;

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
  });
}
