"use client";

import type { Track } from "@/lib/db/schema";
import { useQuery } from "@tanstack/react-query";

async function fetchTracks(): Promise<Track[]> {
  const res = await fetch("/api/tracks");
  if (!res.ok) {
    throw new Error("Failed to fetch tracks");
  }
  return res.json();
}

export function useListTracks() {
  return useQuery<Track[], Error>({
    queryKey: ["tracks"],
    queryFn: fetchTracks,
  });
}
