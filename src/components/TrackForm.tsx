"use client";

import { CopyLinkButton } from "@/components/CopyLinkButton";
import { TrackListItem } from "@/components/TrackListItem";
import { TRACK_LINK_LABELS } from "@/config";
import { useCreateTrack } from "@/hooks/mutations/useCreateTrack";
import { useDeleteTrack } from "@/hooks/mutations/useDeleteTrack";
import { useUpdateTrack } from "@/hooks/mutations/useUpdateTrack";
import type { TrackResponse } from "@/hooks/queries/useTrack";
import { extractAudioMetadata } from "@/lib/audioMetadata";
import { assetUrl } from "@/lib/cdn";
import { timeAgo } from "@/lib/time";
import { TRACK_LINK_KEYS, type TrackLinkKey } from "@/lib/trackLinks";
import { extractWaveformPeaks, parsePeaks, type WaveformAnalysis } from "@/lib/waveform";
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

function toDateInputValue(date: Date | number | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

// Creates an object URL for local file previews (artwork image, audio
// playback) and revokes it on cleanup so we don't leak blob URLs.
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return url;
}

interface TrackFormValues {
  title: string;
  slug: string;
  description: string;
  tags: string;
  recordedAt: string;
  links: Record<TrackLinkKey, string>;
}

export function TrackForm({ track }: { track?: TrackResponse }) {
  const isEditMode = Boolean(track);
  const router = useRouter();
  const createTrack = useCreateTrack();
  const updateTrack = useUpdateTrack(track?.id ?? "");
  const deleteTrack = useDeleteTrack();
  const mutation = isEditMode ? updateTrack : createTrack;

  const { register, handleSubmit, watch, setValue, getValues } = useForm<TrackFormValues>({
    defaultValues: {
      title: track?.title ?? "",
      slug: track?.slug ?? "",
      description: track?.description ?? "",
      tags: track?.tags.join(", ") ?? "",
      recordedAt: track?.recordedAt ? toDateInputValue(track.recordedAt) : "",
      links: TRACK_LINK_KEYS.reduce(
        (acc, key) => {
          acc[key] = track?.links[key] ?? "";
          return acc;
        },
        {} as Record<TrackLinkKey, string>,
      ),
    },
  });

  const [slugTouched, setSlugTouched] = useState(isEditMode);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [waveformAnalysis, setWaveformAnalysis] = useState<WaveformAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const audioPreviewUrl = useObjectUrl(audioFile);
  const artworkPreviewUrl = useObjectUrl(artworkFile);
  const audioSrc = audioPreviewUrl ?? (track ? assetUrl(track.audioFile) : null);
  const artworkSrc = artworkPreviewUrl ?? (track ? assetUrl(track.artworkFile) : null);

  const existingWaveformPeaks = useMemo(
    () => (track ? parsePeaks(track.waveformPreview) : null),
    [track],
  );

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [hasPreviewPlayed, setHasPreviewPlayed] = useState(false);
  const previewPeaks = waveformAnalysis?.peaks ?? existingWaveformPeaks ?? [];
  const previewDuration = waveformAnalysis?.duration ?? track?.duration ?? 0;

  const titleValue = watch("title");
  const descriptionValue = watch("description");
  const tagsValue = watch("tags");
  const previewTags = tagsValue
    ? tagsValue
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
  const linksValue = watch("links");

  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(titleValue));
  }, [titleValue, slugTouched, setValue]);

  const slugField = register("slug", { required: true });

  async function handleAudioFileChange(file: File | null) {
    setAudioFile(file);
    setWaveformAnalysis(null);
    setAnalyzeError(null);
    if (!file) return;

    const metadata = await extractAudioMetadata(file);

    if (!getValues("title").trim() && metadata.title) {
      setValue("title", metadata.title);
    }

    // Prefer a recording date embedded in the file's own tags; file's
    // lastModified is the closest fallback browsers expose otherwise, since
    // audio files are rarely touched again after export. Only fills in if
    // the field isn't already set, so it never clobbers a manual edit.
    if (!getValues("recordedAt")) {
      setValue("recordedAt", toDateInputValue(metadata.recordedAt ?? file.lastModified));
    }

    setIsAnalyzing(true);
    try {
      const analysis = await extractWaveformPeaks(file);
      setWaveformAnalysis(analysis);
    } catch {
      setAnalyzeError("Could not read that audio file. Try a different file.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleDelete() {
    if (!track) return;
    if (!confirm(`Delete "${track.title}"? This can't be undone.`)) return;

    try {
      await deleteTrack.mutateAsync(track.id);
      router.push("/admin");
    } catch {
      // deleteTrack.error already reflects the failure
    }
  }

  function serializeLinks(links: Record<TrackLinkKey, string>): string {
    const trimmed: Partial<Record<TrackLinkKey, string>> = {};
    for (const key of TRACK_LINK_KEYS) {
      const value = links[key]?.trim();
      if (value) trimmed[key] = value;
    }
    return JSON.stringify(trimmed);
  }

  async function onSubmit(values: TrackFormValues) {
    if (isEditMode && track) {
      try {
        await updateTrack.mutateAsync({
          title: values.title,
          description: values.description,
          tags: values.tags,
          slug: values.slug,
          recordedAt: values.recordedAt,
          links: serializeLinks(values.links),
          artworkFile: artworkFile ?? undefined,
        });
        router.push("/admin");
      } catch {
        // updateTrack.error already reflects the failure
      }
      return;
    }

    if (!audioFile || !artworkFile || !waveformAnalysis) return;

    setUploadProgress(0);
    try {
      await createTrack.mutateAsync({
        title: values.title,
        description: values.description,
        tags: values.tags,
        slug: values.slug,
        recordedAt: values.recordedAt,
        links: serializeLinks(values.links),
        audioFile,
        artworkFile,
        waveformPreview: JSON.stringify(waveformAnalysis.peaks),
        duration: waveformAnalysis.duration,
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
          {isEditMode && track && <CopyLinkButton slug={track.slug} showLabel />}
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

      <div className="form-control">
        <label className="label">
          <span className="label-text">Links</span>
        </label>
        <div className="space-y-2">
          {TRACK_LINK_KEYS.map((key) => (
            <input
              key={key}
              type="url"
              placeholder={`${TRACK_LINK_LABELS[key]} link`}
              aria-label={`${TRACK_LINK_LABELS[key]} link`}
              className="input input-bordered w-full"
              {...register(`links.${key}`)}
            />
          ))}
        </div>
      </div>

      <div className="form-control">
        <label className="label" htmlFor="recordedAt">
          <span className="label-text">Recorded at</span>
        </label>
        <input
          id="recordedAt"
          type="date"
          className="input input-bordered w-full"
          {...register("recordedAt")}
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

      {deleteTrack.error && (
        <p className="text-error text-sm" role="alert">
          {deleteTrack.error.message}
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

      {audioSrc && artworkSrc && previewPeaks.length > 0 && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Homepage preview</span>
          </label>
          <ul>
            <TrackListItem
              title={titleValue || "Untitled"}
              description={descriptionValue}
              tags={previewTags}
              peaks={previewPeaks}
              duration={previewDuration}
              audioSrc={audioSrc}
              artworkSrc={artworkSrc}
              links={linksValue}
              timeLabel={track ? timeAgo(track.createdAt) : "Just now"}
              slug={track?.slug}
              isPlaying={isPreviewPlaying}
              isLastPlayed={hasPreviewPlayed}
              onPlay={() => {
                setIsPreviewPlaying(true);
                setHasPreviewPlayed(true);
              }}
              onPause={() => setIsPreviewPlaying(false)}
            />
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex gap-2">
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

        {isEditMode && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteTrack.isPending}
            className="btn btn-error btn-outline"
          >
            {deleteTrack.isPending ? "Deleting..." : "Delete track"}
          </button>
        )}
      </div>
    </form>
  );
}
