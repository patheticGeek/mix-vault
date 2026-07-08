"use client";

import { Waveform } from "@/components/Waveform";
import type { TrackSummary } from "@/hooks/queries/useListTracks";
import { useAudio } from "@/hooks/useAudio";
import { assetUrl } from "@/lib/cdn";
import { formatDuration, timeAgo } from "@/lib/time";
import { useMemo } from "react";

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

interface TrackListItemProps {
  track: TrackSummary;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

export function TrackListItem({ track, isPlaying, onPlay, onPause }: TrackListItemProps) {
  const { audioProps, currentTime, seek } = useAudio({
    src: assetUrl(track.audioFile),
    duration: track.duration,
    isPlaying,
    onPlay,
    onPause,
  });

  const peaks = useMemo(() => {
    try {
      const parsed = JSON.parse(track.waveformPreview);
      return Array.isArray(parsed) ? (parsed as number[]) : [];
    } catch {
      return [];
    }
  }, [track.waveformPreview]);

  function togglePlay() {
    if (isPlaying) onPause();
    else onPlay();
  }

  return (
    <li className="grid grid-cols-[auto_1fr] items-stretch gap-4 p-4 bg-base-200 rounded-box">
      <div className="relative aspect-square rounded overflow-hidden bg-base-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetUrl(track.artworkFile)} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
        >
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-base-100/90 text-base-content">
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </span>
        </button>
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold truncate">{track.title}</h3>
          <span className="text-xs text-base-content/60 shrink-0">{timeAgo(track.createdAt)}</span>
        </div>

        {track.tags.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
            {track.tags.map((tag) => (
              <span key={tag} className="text-xs text-base-content/50">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="relative mt-3">
          <Waveform peaks={peaks} progress={track.duration ? currentTime / track.duration : 0} onSeek={seek} />
          <span className="absolute bottom-0.5 left-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
            {formatDuration(currentTime)}
          </span>
          <span className="absolute bottom-0.5 right-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
            {formatDuration(track.duration)}
          </span>
        </div>
      </div>

      <audio {...audioProps} />
    </li>
  );
}
