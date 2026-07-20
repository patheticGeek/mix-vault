"use client";

import { CopyLinkButton } from "@/components/CopyLinkButton";
import { Waveform } from "@/components/Waveform";
import { useAudio } from "@/hooks/useAudio";
import { formatDuration } from "@/lib/time";
import { useEffect, useState } from "react";

// Tracks whether the page's #hash currently points at this slug, so a
// shared link (see CopyLinkButton) can highlight the track it targets.
function useIsHashTarget(slug?: string): boolean {
  const [hash, setHash] = useState<string | null>(null);

  useEffect(() => {
    const readHash = () => setHash(window.location.hash.slice(1) || null);
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  return Boolean(slug) && hash === slug;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 translate-x-0.5">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

interface TrackListItemProps {
  title: string;
  tags: string[];
  peaks: number[];
  duration: number;
  audioSrc: string;
  artworkSrc: string;
  timeLabel: string;
  slug?: string;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

// Presentational only — deliberately takes resolved values (urls, parsed
// peaks, a pre-formatted time label) rather than a raw track record, so the
// same component can render either a saved track or a live form preview.
export function TrackListItem({
  title,
  tags,
  peaks,
  duration,
  audioSrc,
  artworkSrc,
  timeLabel,
  slug,
  isPlaying,
  onPlay,
  onPause,
}: TrackListItemProps) {
  const { audioProps, currentTime, isBuffering, seek } = useAudio({
    src: audioSrc,
    duration,
    isPlaying,
    onPlay,
    onPause,
  });
  const isHashTarget = useIsHashTarget(slug);

  function togglePlay() {
    if (isPlaying) onPause();
    else onPlay();
  }

  return (
    <li
      id={slug}
      className={`grid grid-cols-[auto_1fr] items-stretch gap-4 p-4 rounded-box transition-colors duration-500 ${
        isHashTarget ? "bg-yellow-400/20 ring-2 ring-yellow-400" : "bg-base-200"
      }`}
    >
      <div className="relative aspect-square rounded overflow-hidden bg-base-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artworkSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
        >
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-base-100/90 text-base-content">
            {isPlaying ? isBuffering ? <SpinnerIcon /> : <PauseIcon /> : <PlayIcon />}
          </span>
        </button>
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold truncate">{title}</h3>
          <div className="flex items-center gap-1 shrink-0">
            {slug && <CopyLinkButton slug={slug} />}
            <span className="text-xs text-base-content/60">{timeLabel}</span>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
            {tags.map((tag) => (
              <span key={tag} className="text-xs text-base-content/50">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="relative mt-3">
          <Waveform peaks={peaks} progress={duration ? currentTime / duration : 0} onSeek={seek} />
          <span className="absolute bottom-0.5 left-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
            {formatDuration(currentTime)}
          </span>
          <span className="absolute bottom-0.5 right-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      <audio {...audioProps} />
    </li>
  );
}
