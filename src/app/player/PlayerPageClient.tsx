"use client";

import { usePlayer } from "@/components/PlayerProvider";
import { DEFAULT_SKIN_ID, SKINS, getSkin } from "@/components/magic/skins";
import type { MagicQueueItem } from "@/components/magic/types";
import { useListTracks, type TrackSummary } from "@/hooks/queries/useListTracks";
import { assetUrl } from "@/lib/cdn";
import { formatDuration } from "@/lib/time";
import { parsePeaks } from "@/lib/waveform";
import { ArrowLeft, ListMusic, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const SKIN_STORAGE_KEY = "mix-vault:magic-skin";

interface PlayerPageClientProps {
  initialTracks: TrackSummary[];
}

// The full-screen skinnable player. It isn't tied to a slug: it reflects
// whatever the shared PlayerProvider is playing and adopts the whole track
// list as the queue so playback can advance through it (auto-advancing on
// end, or via the playlist / next-prev controls).
export function PlayerPageClient({ initialTracks }: PlayerPageClientProps) {
  const { data: fetched } = useListTracks();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    isBuffering,
    volume,
    queueIndex,
    hasNext,
    hasPrev,
    toggle,
    seek,
    setVolume,
    setQueue,
    playQueue,
    next,
    prev,
  } = usePlayer();

  // Server-rendered list is shown instantly; the client fetch fills in the
  // rest / keeps it fresh.
  const tracks = fetched ?? initialTracks;

  // The queue as PlayerTracks (audio urls resolved, peaks parsed once).
  const queueTracks = useMemo(
    () =>
      tracks.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        audioSrc: assetUrl(t.audioFile),
        artworkSrc: assetUrl(t.artworkFile),
        duration: t.duration,
        peaks: parsePeaks(t.waveformPreview),
      })),
    [tracks],
  );

  // Adopt the list as the player's queue whenever it changes, without
  // disturbing anything already playing.
  useEffect(() => {
    setQueue(queueTracks);
  }, [queueTracks, setQueue]);

  const [skinId, setSkinId] = useState(DEFAULT_SKIN_ID);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(SKIN_STORAGE_KEY) : null;
    if (stored && SKINS.some((s) => s.id === stored)) setSkinId(stored);
  }, []);

  const selectSkin = useCallback((id: string) => {
    setSkinId(id);
    try {
      localStorage.setItem(SKIN_STORAGE_KEY, id);
    } catch {
      // storage may be unavailable (private mode) — fine, just don't persist
    }
  }, []);

  const onSelectTrack = useCallback(
    (index: number) => playQueue(queueTracks, index),
    [playQueue, queueTracks],
  );

  const onTogglePlay = useCallback(() => {
    if (currentTrack) toggle(currentTrack);
  }, [currentTrack, toggle]);

  const skinQueue = useMemo<MagicQueueItem[]>(
    () =>
      queueTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artworkSrc: t.artworkSrc,
        duration: t.duration,
      })),
    [queueTracks],
  );

  const skin = getSkin(skinId);
  const SkinComponent = skin.Component;

  const backdropSrc = currentTrack?.artworkSrc ?? queueTracks[0]?.artworkSrc;
  const progress = currentTrack?.duration
    ? Math.min(1, currentTime / currentTrack.duration)
    : 0;

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-black overflow-y-auto p-4">
      {/* Ambient backdrop from the artwork, blurred, so the void isn't flat. */}
      {backdropSrc && (
        <div
          aria-hidden
          className="fixed inset-0 opacity-25 blur-3xl scale-125"
          style={{
            backgroundImage: `url(${backdropSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-6 my-auto py-10 w-full">
        {currentTrack ? (
          <SkinComponent
            track={{
              title: currentTrack.title,
              artist: undefined,
              artworkSrc: currentTrack.artworkSrc,
              duration: currentTrack.duration,
            }}
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            currentTime={currentTime}
            progress={progress}
            volume={volume}
            peaks={currentTrack.peaks ?? []}
            queue={skinQueue}
            currentIndex={queueIndex}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onTogglePlay={onTogglePlay}
            onSeek={seek}
            onVolumeChange={setVolume}
            onNext={next}
            onPrev={prev}
            onSelectTrack={onSelectTrack}
            formatTime={formatDuration}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-white/70">
            <ListMusic className="h-8 w-8 text-white/40" />
            <p className="text-lg font-semibold">Nothing playing</p>
            <p className="text-sm text-white/50">Pick a track below to start.</p>
          </div>
        )}

        {/* Skin switcher — minimal shared chrome, only relevant once a skin
            is actually on screen. */}
        {currentTrack && (
          <div className="flex flex-wrap items-center justify-center gap-1">
            {SKINS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSkin(s.id)}
                title={s.description}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  s.id === skinId
                    ? "border-white/80 bg-white/90 text-black"
                    : "border-white/25 text-white/70 hover:border-white/50 hover:text-white"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Playlist / queue — the track list, styled to match the page and
            shared across every skin. */}
        {queueTracks.length > 0 && (
          <div className="w-[min(92vw,440px)] rounded-xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">
                <ListMusic className="h-3.5 w-3.5" />
                Queue
                <span className="text-white/30">· {queueTracks.length}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prev}
                  disabled={!hasPrev}
                  aria-label="Previous track"
                  className="rounded p-1 text-white/70 hover:text-white disabled:opacity-25 disabled:hover:text-white/70"
                >
                  <SkipBack className="h-4 w-4" fill="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  disabled={!currentTrack}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="rounded p-1 text-white/70 hover:text-white disabled:opacity-25"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" fill="currentColor" />
                  ) : (
                    <Play className="h-4 w-4" fill="currentColor" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={!hasNext}
                  aria-label="Next track"
                  className="rounded p-1 text-white/70 hover:text-white disabled:opacity-25 disabled:hover:text-white/70"
                >
                  <SkipForward className="h-4 w-4" fill="currentColor" />
                </button>
              </div>
            </div>

            <ul className="max-h-72 overflow-y-auto">
              {queueTracks.map((t, i) => {
                const isCurrent = i === queueIndex;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onSelectTrack(i)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                        isCurrent ? "bg-white/15" : "hover:bg-white/10"
                      }`}
                    >
                      <span className="w-5 shrink-0 text-center text-xs tabular-nums text-white/40">
                        {isCurrent && isPlaying ? (
                          <Pause className="mx-auto h-3 w-3 text-white" fill="currentColor" />
                        ) : isCurrent ? (
                          <Play className="mx-auto h-3 w-3 text-white" fill="currentColor" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.artworkSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          isCurrent ? "font-semibold text-white" : "text-white/80"
                        }`}
                      >
                        {t.title}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-white/40">
                        {formatDuration(t.duration)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Subtle escape hatch — back to the current track's page when we know
          it, otherwise to the homepage. */}
      <Link
        href={currentTrack?.slug ? `/track/${currentTrack.slug}` : "/"}
        className="fixed top-4 left-4 z-20 flex items-center gap-1 text-xs text-white/50 hover:text-white/90 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>
    </div>
  );
}
