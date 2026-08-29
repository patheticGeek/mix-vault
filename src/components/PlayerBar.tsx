"use client";

import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { QueuePanel, type QueuePanelItem } from "@/components/magic/QueuePanel";
import { usePlayer } from "@/components/PlayerProvider";
import { useTheme } from "@/components/ThemeProvider";
import { formatDuration } from "@/lib/time";

// How long the fly in/out transition takes, kept in sync with the
// `duration-300` transition class below so the exit unmount timer matches
// what's actually on screen.
const TRANSITION_MS = 300;

// The single persistent mini player, present on every route once something's
// playing. Collapsed, it's a compact bar with playback + seek; the chevron
// expands it inline into transport controls, volume, and the queue — no
// separate page or full-screen modal.
export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    isBuffering,
    volume,
    queue,
    queueIndex,
    hasNext,
    hasPrev,
    toggle,
    seek,
    setVolume,
    playAt,
    reorderQueue,
    removeFromQueue,
    clearQueue,
    next,
    prev,
  } = usePlayer();
  const { skin } = useTheme();
  const theme = skin.theme;

  const shouldShow = !!currentTrack;
  // Stay mounted for one extra transition cycle after shouldShow goes false
  // so the exit animation can play instead of the bar just vanishing.
  const [mounted, setMounted] = useState(shouldShow);
  const [entered, setEntered] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (shouldShow) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    setExpanded(false);
    const timeout = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [shouldShow]);

  const queueItems = useMemo<QueuePanelItem[]>(
    () =>
      queue.map((t) => ({
        id: t.id,
        title: t.title,
        artworkSrc: t.artworkSrc,
        duration: t.duration,
      })),
    [queue],
  );

  const progress = currentTrack?.duration ? Math.min(1, currentTime / currentTrack.duration) : 0;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!mounted || !currentTrack) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md transition-all duration-300 ease-out ${
        entered ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
      }`}
    >
      <div className="rounded-box bg-base-300 shadow-lg overflow-hidden">
        <div className="flex items-center gap-3 p-2 pr-2">
          <div className="relative w-10 h-10 shrink-0 rounded overflow-hidden bg-base-300">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentTrack.artworkSrc}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          <button
            type="button"
            onClick={() => toggle(currentTrack)}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="btn btn-ghost btn-circle btn-sm shrink-0 cursor-pointer"
          >
            {isPlaying ? (
              isBuffering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pause className="w-4 h-4" fill="currentColor" />
              )
            ) : (
              <Play className="w-4 h-4 translate-x-0.5" fill="currentColor" />
            )}
          </button>

          <span className="min-w-0 flex-1 truncate text-sm font-medium">{currentTrack.title}</span>

          <span className="text-xs tabular-nums text-base-content/60 shrink-0">
            {formatDuration(currentTime)} / {formatDuration(currentTrack.duration)}
          </span>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse player" : "Expand player"}
            aria-expanded={expanded}
            className="btn btn-ghost btn-circle btn-sm shrink-0 cursor-pointer"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="range range-primary range-xs w-full block rounded-none cursor-pointer"
        />

        {expanded && (
          <div className="border-t border-base-content/10">
            <div className="flex items-center gap-2 px-3 py-2">
              <VolumeIcon className="w-4 h-4 text-base-content/60 shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="range range-xs flex-1 cursor-pointer"
              />
            </div>

            {queueItems.length > 0 ? (
              <QueuePanel
                items={queueItems}
                currentIndex={queueIndex}
                isPlaying={isPlaying}
                hasNext={hasNext}
                hasPrev={hasPrev}
                theme={theme}
                formatTime={formatDuration}
                onSelect={playAt}
                onReorder={reorderQueue}
                onTogglePlay={() => toggle(currentTrack)}
                onNext={next}
                onPrev={prev}
                onRemove={(index) => {
                  const track = queue[index];
                  if (track) removeFromQueue(track.id);
                }}
                onClear={clearQueue}
              />
            ) : (
              <p className="px-3 py-4 text-center text-sm text-base-content/50">Queue is empty</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
