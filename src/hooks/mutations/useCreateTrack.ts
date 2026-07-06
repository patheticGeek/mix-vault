"use client";

import { apiClient } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";

const createTrackEndpoint = apiClient.api.tracks.$post;

export type CreateTrackInput = InferRequestType<
  typeof createTrackEndpoint
>["form"];
type CreateTrackResponse = InferResponseType<typeof createTrackEndpoint, 201>;

interface CreateTrackVariables extends CreateTrackInput {
  onProgress?: (percent: number) => void;
}

function createTrack({
  onProgress,
  ...form
}: CreateTrackVariables): Promise<CreateTrackResponse> {
  const formData = new FormData();
  formData.set("title", form.title);
  formData.set("description", form.description);
  if (form.tags !== undefined) formData.set("tags", form.tags);
  if (form.slug !== undefined) formData.set("slug", form.slug);
  formData.set("audioFile", form.audioFile);
  formData.set("artworkFile", form.artworkFile);
  formData.set("waveformPreview", form.waveformPreview);

  return new Promise<CreateTrackResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/tracks");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON response, handled by the status check below
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as CreateTrackResponse);
        return;
      }

      const hasErrorMessage =
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as Record<string, unknown>).error === "string";
      reject(
        new Error(
          hasErrorMessage
            ? (data as { error: string }).error
            : "Failed to create track",
        ),
      );
    };

    xhr.onerror = () => reject(new Error("Failed to create track"));
    xhr.send(formData);
  });
}

export function useCreateTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTrack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}
