"use client";

import { Waveform } from "@/components/Waveform";
import type { TrackSummary } from "@/hooks/queries/useListTracks";
import { assetUrl } from "@/lib/cdn";
import { formatDuration, timeAgo } from "@/lib/time";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const peaks = useMemo(() => {
    try {
      const parsed = JSON.parse(track.waveformPreview);
      return Array.isArray(parsed) ? (parsed as number[]) : [];
    } catch {
      return [];
    }
  }, [track.waveformPreview]);

  // Reacts to isPlaying regardless of *why* it changed (this item's own button,
  // or another item starting up and taking over as the only one playing).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  function togglePlay() {
    if (isPlaying) onPause();
    else onPlay();
  }

  function seek(fraction: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = fraction * duration;
    setCurrentTime(audio.currentTime);
    if (!isPlaying) onPlay();
  }

  return (
    <li className="flex gap-4 p-4">
      <div className="relative w-28 h-28 shrink-0 rounded overflow-hidden bg-base-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetUrl(track.artworkFile)} alt="" className="w-full h-full object-cover" />
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

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold truncate">{track.title}</h3>
          <div className="flex items-center gap-2 shrink-0 text-xs text-base-content/60">
            {track.tags.map((tag) => (
              <span key={tag} className="badge badge-sm badge-primary">
                #{tag}
              </span>
            ))}
            <span>{timeAgo(track.createdAt)}</span>
          </div>
        </div>

        <div className="relative mt-3">
          <Waveform peaks={peaks} progress={duration ? currentTime / duration : 0} onSeek={seek} />
          <span className="absolute bottom-0.5 right-1 text-[10px] text-base-content/70 bg-base-100/70 px-1 rounded">
            {formatDuration(isPlaying || currentTime > 0 ? currentTime : duration)}
          </span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={assetUrl(track.audioFile)}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setCurrentTime(0);
          onPause();
        }}
      />
    </li>
  );
}
