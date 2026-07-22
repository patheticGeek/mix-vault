"use client";

import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EnqueueMenu } from "@/components/EnqueueMenu";
import { usePlayer } from "@/components/PlayerProvider";
import { Waveform } from "@/components/Waveform";
import { TRACK_LINK_ICONS, TRACK_LINK_LABELS } from "@/config";
import { useTrackBySlug, type TrackBySlugResponse } from "@/hooks/queries/useTrackBySlug";
import { useTrackVisibility } from "@/hooks/useTrackVisibility";
import { assetUrl } from "@/lib/cdn";
import { formatDuration, timeAgo } from "@/lib/time";
import { TRACK_LINK_KEYS } from "@/lib/trackLinks";
import { parsePeaks } from "@/lib/waveform";
import { ArrowLeft, Loader2, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

interface TrackPageClientProps {
  slug: string;
  initialTrack?: TrackBySlugResponse | null;
}

export function TrackPageClient({ slug, initialTrack }: TrackPageClientProps) {
  const { data: track, isLoading, error } = useTrackBySlug(slug, initialTrack);
  const { currentTrack, isPlaying: playerIsPlaying, currentTime: playerCurrentTime, isBuffering: playerIsBuffering, toggle, seek } = usePlayer();

  const isCurrent = Boolean(track) && currentTrack?.id === track?.id;
  const isPlaying = isCurrent && playerIsPlaying;
  const currentTime = isCurrent ? playerCurrentTime : 0;
  const isBuffering = isCurrent && playerIsBuffering;

  const mainRef = useRef<HTMLElement>(null);
  useTrackVisibility(track?.id, mainRef);

  function playerTrackFor(t: NonNullable<typeof track>) {
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      audioSrc: assetUrl(t.audioFile),
      artworkSrc: assetUrl(t.artworkFile),
      duration: t.duration,
      peaks: parsePeaks(t.waveformPreview),
    };
  }

  function togglePlay() {
    if (!track) return;
    toggle(playerTrackFor(track));
  }

  const artwork = track && (
    <div className="relative w-48 h-48 sm:w-56 sm:h-56 shrink-0 rounded-box overflow-hidden bg-base-300 shadow-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={assetUrl(track.artworkFile)} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
      >
        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-base-100/90 text-base-content">
          {isPlaying ? (
            isBuffering ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Pause className="w-8 h-8" fill="currentColor" />
            )
          ) : (
            <Play className="w-8 h-8 translate-x-0.5" fill="currentColor" />
          )}
        </span>
      </button>
    </div>
  );

  const tagList = track && track.tags.length > 0 && (
    <div className="flex flex-wrap gap-x-2 gap-y-1">
      {track.tags.map((tag) => (
        <span key={tag} className="text-sm text-base-content/50">
          #{tag}
        </span>
      ))}
    </div>
  );

  const dateLine = track && (
    <p className="text-sm text-base-content/60 mt-1">
      {track.recordedAt &&
        `Recorded ${new Date(track.recordedAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })} · `}
      Uploaded {timeAgo(track.createdAt)}
    </p>
  );

  const waveform = track && (
    <div className="relative w-full">
      <Waveform
        peaks={parsePeaks(track.waveformPreview)}
        progress={track.duration ? currentTime / track.duration : 0}
        onSeek={isCurrent ? seek : undefined}
      />
      <span className="absolute bottom-0.5 left-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
        {formatDuration(currentTime)}
      </span>
      <span className="absolute bottom-0.5 right-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
        {formatDuration(track.duration)}
      </span>
    </div>
  );

  const descriptionEl = track?.description && (
    <p className="text-left w-full text-base-content/80 whitespace-pre-wrap">{track.description}</p>
  );

  const linksRow = track && (
    <div className="flex flex-col items-start self-start gap-1">
      <EnqueueMenu track={playerTrackFor(track)} showLabel align="start" />
      <CopyLinkButton slug={track.slug} showLabel />
      {TRACK_LINK_KEYS.filter((key) => track.links[key]).map((key) => {
        const Icon = TRACK_LINK_ICONS[key];
        return (
          <a
            key={key}
            href={track.links[key]}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-xs gap-1"
          >
            <Icon className="w-4 h-4" />
            Listen on {TRACK_LINK_LABELS[key]}
          </a>
        );
      })}
    </div>
  );

  return (
    <div className="bg-base-100 text-base-content min-h-[calc(100vh-4rem)]">
      <main ref={mainRef} className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="btn btn-ghost btn-sm gap-1 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to all tracks
        </Link>

        {isLoading && (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}

        {error && <p className="text-error text-center">Failed to load track: {error.message}</p>}

        {track === null && (
          <div className="text-center py-10">
            <p className="text-lg font-semibold">Track not found</p>
            <p className="text-base-content/60 mt-1">It may have been removed or the link is wrong.</p>
            <Link href="/" className="btn btn-primary btn-sm mt-6">
              Back to all tracks
            </Link>
          </div>
        )}

        {track && (
          <>
            {/* Mobile: everything centered in one stacked column. */}
            <div className="flex flex-col items-center text-center gap-4 sm:hidden">
              {artwork}
              <div>
                <h1 className="text-3xl font-bold">{track.title}</h1>
                {dateLine}
              </div>
              {tagList}
              {waveform}
              {descriptionEl}
              {linksRow}
            </div>

            {/* Desktop/tablet landscape: title/date/tags on the left, artwork
                on the right, then waveform, description, and the link row
                each spanning full width below. */}
            <div className="hidden sm:flex sm:flex-col sm:gap-4">
              <div className="flex items-start justify-between gap-8">
                <div className="text-left">
                  <h1 className="text-4xl font-bold">{track.title}</h1>
                  {dateLine}
                  {tagList && <div className="mt-3">{tagList}</div>}
                </div>
                {artwork}
              </div>
              {waveform}
              {descriptionEl}
              {linksRow}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
