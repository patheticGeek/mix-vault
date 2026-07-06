"use client";

import { apiClient } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";

const updateTrackEndpoint = apiClient.api.tracks[":id"].$patch;

export type UpdateTrackInput = InferRequestType<typeof updateTrackEndpoint>["form"];
type UpdateTrackResponse = InferResponseType<typeof updateTrackEndpoint, 200>;

async function updateTrack(id: string, form: UpdateTrackInput): Promise<UpdateTrackResponse> {
  const res = await updateTrackEndpoint({ param: { id }, form });
  const data: unknown = await res.json();
  if (!res.ok) {
    const hasErrorMessage = data && typeof data === "object" && "error" in data && typeof (data as Record<string, unknown>).error === "string";
    throw new Error(hasErrorMessage ? (data as { error: string }).error : "Failed to update track");
  }
  return data as UpdateTrackResponse;
}

export function useUpdateTrack(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (form: UpdateTrackInput) => updateTrack(id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}
