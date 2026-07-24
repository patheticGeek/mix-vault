"use client";

import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EnqueueMenu } from "@/components/EnqueueMenu";
import { DownloadButton } from "@/components/offline/DownloadButton";
import { usePlayer } from "@/components/PlayerProvider";
import { Waveform } from "@/components/Waveform";
import { TRACK_LINK_ICONS, TRACK_LINK_LABELS } from "@/config";
import { useTrackVisibility } from "@/hooks/useTrackVisibility";
import { useWaveform } from "@/hooks/queries/useWaveform";
import { formatDuration } from "@/lib/time";
import { TRACK_LINK_KEYS, type TrackLinks } from "@/lib/trackLinks";
import { Loader2, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  id?: string;
  title: string;
  description?: string;
  tags: string[];
  duration: number;
  audioSrc: string;
  artworkSrc: string;
  timeLabel: string;
  slug?: string;
  links?: TrackLinks;
  isLastPlayed?: boolean;
}

// Presentational only — deliberately takes resolved values (urls, a
// pre-formatted time label) rather than a raw track record, so the same
// component can render either a saved track or a live form preview.
// `id` is optional because a live form preview has no saved track to key
// playback state on — it just won't participate in the shared player.
export function TrackListItem({
  id,
  title,
  description,
  tags,
  duration,
  audioSrc,
  artworkSrc,
  timeLabel,
  slug,
  links,
  isLastPlayed = false,
}: TrackListItemProps) {
  const { currentTrack, isPlaying: playerIsPlaying, currentTime: playerCurrentTime, isBuffering: playerIsBuffering, toggle, seek } = usePlayer();
  const isCurrent = id !== undefined && currentTrack?.id === id;
  const isPlaying = isCurrent && playerIsPlaying;
  const currentTime = isCurrent ? playerCurrentTime : 0;
  const isBuffering = isCurrent && playerIsBuffering;

  const itemRef = useRef<HTMLLIElement>(null);
  useTrackVisibility(id, itemRef);
  const router = useRouter();

  // Waveform peaks are fetched separately from the list data (which no longer
  // carries them); the bars stay flat until they arrive.
  const { data: peaks = [] } = useWaveform(id);

  // Clicking anywhere on the card that isn't an interactive control opens the
  // track page. The interactive clusters below (artwork/play, links, and the
  // waveform while it's seekable) stop propagation so they don't trigger this.
  const openTrack = slug ? () => router.push(`/track/${slug}`) : undefined;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const isHashTarget = useIsHashTarget(slug);
  const hashFlash = useHashFlash(isHashTarget);
  const [hasClickedPlay, setHasClickedPlay] = useState(false);

  function togglePlay() {
    setHasClickedPlay(true);
    if (id === undefined) return;
    toggle({ id, slug, title, audioSrc, artworkSrc, duration });
  }

  const artwork = (
    <div onClick={stop} className="relative aspect-square w-24 shrink-0 self-start rounded overflow-hidden bg-base-300">
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
  );

  const linksButtons = (
    <div onClick={stop} className="flex items-center">
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
      {id !== undefined && (
        <EnqueueMenu track={{ id, slug, title, audioSrc, artworkSrc, duration }} />
      )}
      {id !== undefined && (
        <DownloadButton track={{ id, slug, title, audioSrc, artworkSrc, duration }} />
      )}
      {slug && <CopyLinkButton slug={slug} />}
    </div>
  );

  const meta = (
    <div className="flex items-center gap-2 shrink-0">
      {linksButtons}
      <span className="text-xs text-base-content/60">{timeLabel}</span>
    </div>
  );

  const tagList = tags.length > 0 && (
    <div className="flex flex-wrap gap-x-2 gap-y-1">
      {tags.map((tag) => (
        <span key={tag} className="text-xs text-base-content/50">
          #{tag}
        </span>
      ))}
    </div>
  );

  // Mobile has less width to work with, so cap tags at 2 lines instead of
  // letting a long list push everything else down. line-clamp needs normal
  // inline flow (not flex-wrap) to count lines, so this renders as plain
  // inline spans rather than reusing tagList's flex layout.
  const mobileTagList = tags.length > 0 && (
    <p className="text-xs text-base-content/50 line-clamp-2">
      {tags.map((tag) => (
        <span key={tag} className="mr-2">
          #{tag}
        </span>
      ))}
    </p>
  );

  const waveform = (
    // Only swallow the card click while the waveform is actually seekable
    // (this is the current track); otherwise a click should open the track.
    <div className="relative" onClick={isCurrent ? stop : undefined}>
      <Waveform peaks={peaks} progress={duration ? currentTime / duration : 0} onSeek={isCurrent ? seek : undefined} />
      <span className="absolute bottom-0.5 left-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
        {formatDuration(currentTime)}
      </span>
      <span className="absolute bottom-0.5 right-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
        {formatDuration(duration)}
      </span>
    </div>
  );

  const descriptionEl = description && (
    <p className="text-sm text-base-content/70 whitespace-pre-wrap">{description}</p>
  );

  // Links to the track's own page when it has a slug (i.e. it's a saved
  // track, not a live form preview). `contents` keeps the anchor from
  // affecting the surrounding flex layout — the h3 underneath still is the
  // actual flex item.
  function titleEl(className: string) {
    const heading = <h3 className={className}>{title}</h3>;
    // Kept as a real anchor (accessible, middle-clickable) even though the
    // whole card is clickable; stop propagation so it doesn't double-fire the
    // card's own navigation.
    return slug ? (
      <Link href={`/track/${slug}`} onClick={stop} className="contents">
        {heading}
      </Link>
    ) : (
      heading
    );
  }

  return (
    <li
      ref={itemRef}
      id={slug}
      onClick={openTrack}
      className={`flex flex-col gap-3 p-4 rounded-box transition-colors duration-500 ${
        openTrack ? "cursor-pointer" : ""
      } ${
        isPlaying || isLastPlayed
          ? "ring-1 ring-zinc-600"
          : isHashTarget && !hasClickedPlay
            ? "ring-1 ring-yellow-400"
            : ""
      } ${hashFlash && !hasClickedPlay ? "bg-yellow-400/20" : "bg-base-200"}`}
    >
      {/* Mobile: artwork with share/link buttons beside it (uploaded time
          below them), then title, tags, waveform, and description stacked
          full-width below. */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex gap-4">
          {artwork}
          <div className="min-w-0 flex-1 flex flex-col items-end gap-1.5">
            {linksButtons}
            <span className="text-xs text-base-content/60">{timeLabel}</span>
          </div>
        </div>
        {titleEl("font-semibold truncate")}
        {mobileTagList}
        {waveform}
        {descriptionEl}
      </div>

      {/* Desktop/tablet: title + meta share a row beside the artwork, tags
          and waveform below that; description spans full width. */}
      <div className="hidden sm:flex sm:flex-col sm:gap-3">
        <div className="grid grid-cols-[auto_1fr] items-stretch gap-4">
          {artwork}
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-x-3 gap-y-1 flex-wrap">
              {titleEl("font-semibold truncate flex-1 min-w-16")}
              {meta}
            </div>
            <div className="mt-1">{tagList}</div>
            <div className="mt-3">{waveform}</div>
          </div>
        </div>
        {descriptionEl}
      </div>
    </li>
  );
}
