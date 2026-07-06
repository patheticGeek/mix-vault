"use client";

import { useCreateTrack } from "@/hooks/mutations/useCreateTrack";
import { useUpdateTrack } from "@/hooks/mutations/useUpdateTrack";
import type { TrackResponse } from "@/hooks/queries/useTrack";
import { extractWaveformPeaks } from "@/lib/waveform";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function WaveformPreview({ peaks }: { peaks: number[] }) {
  return (
    <div className="flex items-end gap-px h-16 w-full">
      {peaks.map((peak, i) => (
        <div
          key={i}
          className="flex-1 bg-primary rounded-sm"
          style={{ height: `${Math.max(peak * 100, 2)}%` }}
        />
      ))}
    </div>
  );
}

interface TrackFormValues {
  title: string;
  slug: string;
  description: string;
  tags: string;
}

export function TrackForm({ track }: { track?: TrackResponse }) {
  const isEditMode = Boolean(track);
  const router = useRouter();
  const createTrack = useCreateTrack();
  const updateTrack = useUpdateTrack(track?.id ?? "");
  const mutation = isEditMode ? updateTrack : createTrack;

  const { register, handleSubmit, watch, setValue } = useForm<TrackFormValues>({
    defaultValues: {
      title: track?.title ?? "",
      slug: track?.slug ?? "",
      description: track?.description ?? "",
      tags: track?.tags.join(", ") ?? "",
    },
  });

  const [slugTouched, setSlugTouched] = useState(isEditMode);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const existingWaveformPeaks = useMemo(() => {
    if (!track) return null;
    try {
      const parsed = JSON.parse(track.waveformPreview);
      return Array.isArray(parsed) ? (parsed as number[]) : null;
    } catch {
      return null;
    }
  }, [track]);

  const titleValue = watch("title");
  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(titleValue));
  }, [titleValue, slugTouched, setValue]);

  const slugField = register("slug", { required: true });

  async function handleAudioFileChange(file: File | null) {
    setAudioFile(file);
    setWaveformPeaks(null);
    setAnalyzeError(null);
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const peaks = await extractWaveformPeaks(file);
      setWaveformPeaks(peaks);
    } catch {
      setAnalyzeError("Could not read that audio file. Try a different file.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function onSubmit(values: TrackFormValues) {
    if (isEditMode && track) {
      try {
        await updateTrack.mutateAsync({
          title: values.title,
          description: values.description,
          tags: values.tags,
          slug: values.slug,
          artworkFile: artworkFile ?? undefined,
        });
        router.push("/admin");
      } catch {
        // updateTrack.error already reflects the failure
      }
      return;
    }

    if (!audioFile || !artworkFile || !waveformPeaks) return;

    setUploadProgress(0);
    try {
      await createTrack.mutateAsync({
        title: values.title,
        description: values.description,
        tags: values.tags,
        slug: values.slug,
        audioFile,
        artworkFile,
        waveformPreview: JSON.stringify(waveformPeaks),
        onProgress: setUploadProgress,
      });
      router.push("/admin");
    } catch {
      // createTrack.error already reflects the failure
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-control">
        <label className="label" htmlFor="title">
          <span className="label-text">Title</span>
        </label>
        <input
          id="title"
          type="text"
          required
          placeholder="Midnight Drive"
          className="input input-bordered w-full"
          {...register("title", { required: true })}
        />
      </div>

      <div className="form-control">
        <label className="label" htmlFor="slug">
          <span className="label-text">Slug</span>
        </label>
        <input
          id="slug"
          type="text"
          required
          placeholder="midnight-drive"
          className="input input-bordered w-full"
          {...slugField}
          onChange={(e) => {
            setSlugTouched(true);
            slugField.onChange(e);
          }}
        />
      </div>

      <div className="form-control">
        <label className="label" htmlFor="description">
          <span className="label-text">Description</span>
        </label>
        <textarea
          id="description"
          required
          placeholder="What's this track about?"
          className="textarea textarea-bordered w-full"
          rows={4}
          {...register("description", { required: true })}
        />
      </div>

      <div className="form-control">
        <label className="label" htmlFor="tags">
          <span className="label-text">Tags</span>
          <span className="label-text-alt">comma separated</span>
        </label>
        <input
          id="tags"
          type="text"
          placeholder="house, deep, chill"
          className="input input-bordered w-full"
          {...register("tags")}
        />
      </div>

      {isEditMode ? (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Track file</span>
          </label>
          <p className="text-sm text-base-content/60 mb-2">
            The audio file can&apos;t be changed after a track is uploaded.
          </p>
          {existingWaveformPeaks && (
            <WaveformPreview peaks={existingWaveformPeaks} />
          )}
        </div>
      ) : (
        <>
          <div className="form-control">
            <label className="label" htmlFor="audioFile">
              <span className="label-text">Track file</span>
            </label>
            <input
              id="audioFile"
              type="file"
              accept="audio/*"
              required
              onChange={(e) =>
                handleAudioFileChange(e.target.files?.[0] ?? null)
              }
              className="file-input file-input-bordered w-full"
            />
          </div>

          {isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <span className="loading loading-spinner loading-sm" />
              Analyzing waveform...
            </div>
          )}

          {waveformPeaks && !isAnalyzing && (
            <WaveformPreview peaks={waveformPeaks} />
          )}

          {analyzeError && (
            <p className="text-error text-sm" role="alert">
              {analyzeError}
            </p>
          )}
        </>
      )}

      <div className="form-control">
        <label className="label" htmlFor="artworkFile">
          <span className="label-text">
            {isEditMode ? "Update artwork" : "Artwork"}
          </span>
        </label>
        <input
          id="artworkFile"
          type="file"
          accept="image/*"
          required={!isEditMode}
          onChange={(e) => setArtworkFile(e.target.files?.[0] ?? null)}
          className="file-input file-input-bordered w-full"
        />
      </div>

      {mutation.error && (
        <p className="text-error text-sm" role="alert">
          {mutation.error.message}
        </p>
      )}

      {!isEditMode && createTrack.isPending && (
        <div className="space-y-1">
          <progress
            className="progress progress-primary w-full"
            value={uploadProgress}
            max={100}
          />
          <p className="text-sm text-base-content/60">{uploadProgress}%</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isAnalyzing || mutation.isPending}
          className="btn btn-primary"
        >
          {isEditMode
            ? updateTrack.isPending
              ? "Saving..."
              : "Save changes"
            : isAnalyzing
              ? "Analyzing..."
              : createTrack.isPending
                ? "Uploading..."
                : "Upload track"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="btn btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
