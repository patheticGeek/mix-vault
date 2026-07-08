"use client";

import { apiClient } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const deleteTrackEndpoint = apiClient.api.tracks[":id"].$delete;

async function deleteTrack(id: string): Promise<void> {
  const res = await deleteTrackEndpoint({ param: { id } });
  if (!res.ok) {
    let message = "Failed to delete track";
    try {
      const data: unknown = await res.json();
      if (data && typeof data === "object" && "error" in data && typeof (data as Record<string, unknown>).error === "string") {
        message = (data as { error: string }).error;
      }
    } catch {
      // non-JSON response, use the fallback message
    }
    throw new Error(message);
  }
}

export function useDeleteTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTrack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}
