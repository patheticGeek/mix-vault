"use client";

import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

const trackBySlugEndpoint = apiClient.api.tracks.slug[":slug"].$get;

export type TrackBySlugResponse = InferResponseType<typeof trackBySlugEndpoint, 200>;

// null (not thrown) distinguishes "no track at this slug" from a real
// fetch failure, so the page can show a friendly "not found" state for a
// bad/stale link instead of a generic error.
async function fetchTrackBySlug(slug: string): Promise<TrackBySlugResponse | null> {
  const res = await trackBySlugEndpoint({ param: { slug } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error("Failed to fetch track");
  }
  return res.json();
}

export function useTrackBySlug(slug: string) {
  return useQuery<TrackBySlugResponse | null, Error>({
    queryKey: ["tracks", "slug", slug],
    queryFn: () => fetchTrackBySlug(slug),
    enabled: Boolean(slug),
  });
}
