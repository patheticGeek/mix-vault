"use client";

import { CopyLinkButton } from "@/components/CopyLinkButton";
import { usePlayer } from "@/components/PlayerProvider";
import { Waveform } from "@/components/Waveform";
import { TRACK_LINK_ICONS, TRACK_LINK_LABELS } from "@/config";
import { useCreateTrack } from "@/hooks/mutations/useCreateTrack";
import { useDeleteTrack } from "@/hooks/mutations/useDeleteTrack";
import { useUpdateTrack } from "@/hooks/mutations/useUpdateTrack";
import type { TrackResponse } from "@/hooks/queries/useTrack";
import { useWaveform } from "@/hooks/queries/useWaveform";
import { extractAudioMetadata } from "@/lib/audioMetadata";
import { assetUrl } from "@/lib/cdn";
import { formatDuration } from "@/lib/time";
import { TRACK_LINK_KEYS, type TrackLinkKey } from "@/lib/trackLinks";
import { DEFAULT_ARTWORK_KEY } from "@/lib/trackAssetKey";
import { extractWaveformPeaks, type WaveformAnalysis } from "@/lib/waveform";
import { Loader2, Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

// A static placeholder shape for the waveform slot before any audio is
// uploaded — deterministic (no Math.random/Date.now) so it renders the same
// on the server and client.
const DEMO_WAVEFORM_PEAKS = Array.from({ length: 40 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(i * 0.5)));

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

type TrackStatus = "public" | "unlisted" | "private";

const STATUS_OPTIONS: { value: TrackStatus; label: string; hint: string; activeClass: string }[] = [
  {
    value: "public",
    label: "Public",
    hint: "Listed on the homepage, open to anyone.",
    activeClass: "border-transparent bg-green-600 text-white hover:bg-green-600",
  },
  {
    value: "unlisted",
    label: "Unlisted",
    hint: "Hidden from the homepage, open to anyone with the link.",
    activeClass: "border-transparent bg-amber-400 text-amber-950 hover:bg-amber-400",
  },
  {
    value: "private",
    label: "Private",
    hint: "Hidden from the homepage, only opens when you're logged in.",
    activeClass: "border-transparent bg-red-600 text-white hover:bg-red-600",
  },
];

interface TrackFormValues {
  title: string;
  slug: string;
  description: string;
  tags: string;
  status: TrackStatus;
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
      status: (track?.status as TrackStatus | undefined) ?? "public",
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
  const audioInputRef = useRef<HTMLInputElement>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const [waveformAnalysis, setWaveformAnalysis] = useState<WaveformAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const audioPreviewUrl = useObjectUrl(audioFile);
  const artworkPreviewUrl = useObjectUrl(artworkFile);
  const audioSrc = audioPreviewUrl ?? (track ? assetUrl(track.audioFile) : null);
  // Artwork is optional. `artworkSrc` stays null when none is chosen (the box
  // shows its "Upload artwork" placeholder), while preview playback falls back
  // to the shared default so it can start without a picked image.
  const artworkSrc = artworkPreviewUrl ?? (track ? assetUrl(track.artworkFile) : null);
  const previewArtworkSrc = artworkSrc ?? assetUrl(DEFAULT_ARTWORK_KEY);

  // When editing, the existing track's waveform is fetched separately (the
  // track fetch no longer includes it).
  const { data: existingWaveformPeaks } = useWaveform(track?.id);

  const previewPeaks = waveformAnalysis?.peaks ?? existingWaveformPeaks ?? [];
  const previewDuration = waveformAnalysis?.duration ?? track?.duration ?? 0;
  const hasAudioPreview = previewPeaks.length > 0 && Boolean(audioSrc);
  // Falls back to a synthetic id when creating a new track (nothing saved
  // yet to key playback state on) so the preview can still use the shared
  // player; when editing, reusing the real id lets it pick up right where
  // the homepage's own player left off if this track was already playing.
  const previewId = track?.id ?? "__preview__";
  const {
    currentTrack,
    isPlaying: playerIsPlaying,
    currentTime: playerCurrentTime,
    isBuffering: playerIsBuffering,
    toggle,
    seek,
    discard,
    removeFromQueue,
  } = usePlayer();
  const isCurrent = currentTrack?.id === previewId;
  const isPlaying = isCurrent && playerIsPlaying;
  const currentTime = isCurrent ? playerCurrentTime : 0;
  const isBuffering = isCurrent && playerIsBuffering;

  // The synthetic preview-only track (an unsaved track has no real id to
  // hand off to the homepage/mini player) shouldn't outlive this page — the
  // mini player exists for saved tracks, not a form's scratch playback. A
  // track already being edited keeps its real id, so it's left alone and
  // can keep playing in the mini player like any other saved track.
  useEffect(() => {
    if (isEditMode) return;
    return () => discard(previewId);
  }, [isEditMode, previewId, discard]);

  const titleValue = watch("title");
  const statusValue = watch("status");

  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(titleValue));
  }, [titleValue, slugTouched, setValue]);

  function togglePreviewPlay() {
    if (!audioSrc) return;
    toggle({
      id: previewId,
      slug: track?.slug,
      title: titleValue || "Untitled",
      audioSrc,
      artworkSrc: previewArtworkSrc,
      duration: previewDuration,
    });
  }

  const slugField = register("slug", { required: true });

  async function handleAudioFileChange(file: File | null) {
    setAudioFile(file);
    setWaveformAnalysis(null);
    setAnalyzeError(null);
    if (!file) return;

    const metadata = await extractAudioMetadata(file);

    if (!getValues("title").trim()) {
      setValue("title", file.name.replace(/\.[^./]+$/, ""));
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
      // Drop it from the player too, so the queue/mini player don't keep
      // pointing at a track that no longer exists.
      removeFromQueue(track.id);
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
          status: values.status,
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

    if (!audioFile || !waveformAnalysis) return;

    setUploadProgress(0);
    try {
      await createTrack.mutateAsync({
        title: values.title,
        description: values.description,
        tags: values.tags,
        slug: values.slug,
        status: values.status,
        recordedAt: values.recordedAt,
        links: serializeLinks(values.links),
        audioFile,
        artworkFile: artworkFile ?? undefined,
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
        <label className="label">
          <span className="label-text">Visibility</span>
        </label>
        <div className="join w-full">
          {STATUS_OPTIONS.map((option) => {
            const isActive = statusValue === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setValue("status", option.value)}
                className={`btn join-item flex-1 ${isActive ? option.activeClass : "btn-ghost"}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <span className="label-text-alt text-xs text-base-content/60 mt-1">
          {STATUS_OPTIONS.find((option) => option.value === statusValue)?.hint}
        </span>
      </div>

      <div className="flex gap-4">
        {hasAudioPreview ? (
          <div className="relative flex-1 min-w-0 h-24 rounded bg-base-300 overflow-hidden flex items-center px-3 gap-3">
            <button
              type="button"
              onClick={togglePreviewPlay}
              disabled={!audioSrc}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-base-100/90 text-base-content disabled:opacity-40"
            >
              {isPlaying ? (
                isBuffering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Pause className="w-5 h-5" fill="currentColor" />
                )
              ) : (
                <Play className="w-5 h-5 translate-x-0.5" fill="currentColor" />
              )}
            </button>
            <div className="relative flex-1 min-w-0">
              <Waveform
                peaks={previewPeaks}
                progress={previewDuration ? currentTime / previewDuration : 0}
                onSeek={isCurrent ? seek : undefined}
              />
              <span className="absolute bottom-0.5 left-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
                {formatDuration(currentTime)}
              </span>
              <span className="absolute bottom-0.5 right-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
                {formatDuration(previewDuration)}
              </span>
            </div>
          </div>
        ) : isAnalyzing ? (
          <div className="relative flex-1 min-w-0 h-24 rounded bg-base-300 overflow-hidden flex items-center justify-center px-3">
            <div className="absolute inset-0 flex items-end gap-px px-4 py-6 opacity-20">
              {DEMO_WAVEFORM_PEAKS.map((peak, i) => (
                <div key={i} className="flex-1 bg-base-content rounded-sm" style={{ height: `${peak * 100}%` }} />
              ))}
            </div>
            <span className="relative flex items-center gap-2 text-sm font-medium text-base-content/60">
              <span className="loading loading-spinner loading-sm" />
              Analyzing waveform...
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="relative flex-1 min-w-0 h-24 rounded bg-base-300 overflow-hidden flex items-center justify-center px-3"
          >
            <div className="absolute inset-0 flex items-end gap-px px-4 py-6 opacity-20">
              {DEMO_WAVEFORM_PEAKS.map((peak, i) => (
                <div key={i} className="flex-1 bg-base-content rounded-sm" style={{ height: `${peak * 100}%` }} />
              ))}
            </div>
            <span className="relative text-sm font-medium text-base-content/60">Upload audio file</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => artworkInputRef.current?.click()}
          aria-label={isEditMode ? "Update artwork" : "Upload artwork"}
          className="relative w-24 h-24 shrink-0 rounded overflow-hidden bg-base-300"
        >
          {artworkSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artworkSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-center text-xs font-medium text-base-content/60 px-2">
              Artwork (optional)
            </span>
          )}
        </button>
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
        <label htmlFor="slug" className="input input-bordered flex items-center gap-1 w-full">
          <span className="text-base-content/50 select-none">/track/</span>
          <input
            id="slug"
            type="text"
            required
            placeholder="midnight-drive"
            className="grow"
            {...slugField}
            onChange={(e) => {
              setSlugTouched(true);
              slugField.onChange(e);
            }}
          />
        </label>
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
          <span className="label-text-alt text-xs">comma separated</span>
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
          {TRACK_LINK_KEYS.map((key) => {
            const Icon = TRACK_LINK_ICONS[key];
            return (
              <label key={key} className="input input-bordered flex items-center gap-2 w-full">
                <Icon className="w-4 h-4 opacity-60 shrink-0" />
                <input
                  type="url"
                  placeholder={`${TRACK_LINK_LABELS[key]} link`}
                  aria-label={`${TRACK_LINK_LABELS[key]} link`}
                  className="grow"
                  {...register(`links.${key}`)}
                />
              </label>
            );
          })}
        </div>
      </div>

      {!isEditMode && (
        <input
          ref={audioInputRef}
          id="audioFile"
          type="file"
          accept="audio/*"
          required
          onChange={(e) => handleAudioFileChange(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
      )}
      <input
        ref={artworkInputRef}
        id="artworkFile"
        type="file"
        accept="image/*"
        onChange={(e) => setArtworkFile(e.target.files?.[0] ?? null)}
        className="sr-only"
      />

      {analyzeError && (
        <p className="text-error text-sm" role="alert">
          {analyzeError}
        </p>
      )}

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
