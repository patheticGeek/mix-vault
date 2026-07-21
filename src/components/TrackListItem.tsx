"use client";

import { CopyLinkButton } from "@/components/CopyLinkButton";
import { Waveform } from "@/components/Waveform";
import { TRACK_LINK_ICONS, TRACK_LINK_LABELS } from "@/config";
import { useAudio } from "@/hooks/useAudio";
import { formatDuration } from "@/lib/time";
import { TRACK_LINK_KEYS, type TrackLinks } from "@/lib/trackLinks";
import { Loader2, Pause, Play } from "lucide-react";
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

const HASH_FLASH_MS = 5000;

// The background flash fades out after a few seconds, but the border stays
// as long as the hash keeps pointing here — otherwise a track you're still
// looking at loses all trace of being the shared one.
function useHashFlash(isHashTarget: boolean): boolean {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!isHashTarget) {
      setFlash(false);
      return;
    }
    setFlash(true);
    const timeout = setTimeout(() => setFlash(false), HASH_FLASH_MS);
    return () => clearTimeout(timeout);
  }, [isHashTarget]);

  return flash;
}

interface TrackListItemProps {
  title: string;
  description?: string;
  tags: string[];
  peaks: number[];
  duration: number;
  audioSrc: string;
  artworkSrc: string;
  timeLabel: string;
  slug?: string;
  links?: TrackLinks;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

// Presentational only — deliberately takes resolved values (urls, parsed
// peaks, a pre-formatted time label) rather than a raw track record, so the
// same component can render either a saved track or a live form preview.
export function TrackListItem({
  title,
  description,
  tags,
  peaks,
  duration,
  audioSrc,
  artworkSrc,
  timeLabel,
  slug,
  links,
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
  const hashFlash = useHashFlash(isHashTarget);
  const [hasClickedPlay, setHasClickedPlay] = useState(false);

  function togglePlay() {
    setHasClickedPlay(true);
    if (isPlaying) onPause();
    else onPlay();
  }

  return (
    <li
      id={slug}
      className={`flex flex-col gap-3 p-4 rounded-box transition-colors duration-500 ${
        isPlaying ? "ring-1 ring-zinc-600" : isHashTarget && !hasClickedPlay ? "ring-1 ring-yellow-400" : ""
      } ${hashFlash && !hasClickedPlay ? "bg-yellow-400/20" : "bg-base-200"}`}
    >
      <div className="grid grid-cols-[auto_1fr] items-stretch gap-4">
        <div className="relative aspect-square w-24 shrink-0 rounded overflow-hidden bg-base-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artworkSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
          >
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-base-100/90 text-base-content">
              {isPlaying ? (
                isBuffering ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Pause className="w-6 h-6" fill="currentColor" />
                )
              ) : (
                <Play className="w-6 h-6 translate-x-0.5" fill="currentColor" />
              )}
            </span>
          </button>
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-x-3 gap-y-1 flex-wrap">
            <h3 className="font-semibold truncate flex-1 min-w-16">{title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              {links && TRACK_LINK_KEYS.some((key) => links[key]) && (
                <div className="flex items-center">
                  {TRACK_LINK_KEYS.filter((key) => links[key]).map((key) => {
                    const Icon = TRACK_LINK_ICONS[key];
                    return (
                      <a
                        key={key}
                        href={links[key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={TRACK_LINK_LABELS[key]}
                        title={TRACK_LINK_LABELS[key]}
                        className="btn btn-ghost btn-xs"
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              )}
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
      </div>

      {description && <p className="text-sm text-base-content/70 whitespace-pre-wrap">{description}</p>}

      <audio {...audioProps} />
    </li>
  );
}
