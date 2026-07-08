"use client";

import { apiClient } from "@/lib/api-client";
import { uploadAudioMultipart } from "@/lib/multipartUpload";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferRequestType, InferResponseType } from "hono/client";

const createTrackEndpoint = apiClient.api.tracks.$post;

type CreateTrackForm = InferRequestType<typeof createTrackEndpoint>["form"];
type CreateTrackResponse = InferResponseType<typeof createTrackEndpoint, 201>;

export type CreateTrackInput = Omit<CreateTrackForm, "audioFileKey"> & {
  audioFile: File;
};

interface CreateTrackVariables extends CreateTrackInput {
  onProgress?: (percent: number) => void;
}

// The audio file is uploaded to R2 in parts before the track is created, so
// weight it as most of the progress bar and leave the rest for the final call.
const AUDIO_UPLOAD_WEIGHT = 0.9;

async function createTrack({
  onProgress,
  audioFile,
  ...form
}: CreateTrackVariables): Promise<CreateTrackResponse> {
  const audioFileKey = await uploadAudioMultipart(audioFile, {
    onProgress: (percent) => onProgress?.(Math.round(percent * AUDIO_UPLOAD_WEIGHT)),
  });

  const formData = new FormData();
  formData.set("title", form.title);
  formData.set("description", form.description);
  if (form.tags !== undefined) formData.set("tags", form.tags);
  if (form.slug !== undefined) formData.set("slug", form.slug);
  formData.set("audioFileKey", audioFileKey);
  formData.set("artworkFile", form.artworkFile);
  formData.set("waveformPreview", form.waveformPreview);

  return new Promise<CreateTrackResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/tracks");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const remainder = (event.loaded / event.total) * (1 - AUDIO_UPLOAD_WEIGHT) * 100;
        onProgress?.(Math.round(AUDIO_UPLOAD_WEIGHT * 100 + remainder));
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
