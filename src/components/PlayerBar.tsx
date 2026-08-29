"use client";

import { ChevronDown, ChevronUp, ListMusic, Loader2, Pause, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QueuePanel, type QueuePanelItem } from "@/components/magic/QueuePanel";
import { SkinSelector } from "@/components/magic/SkinSelector";
import { TrackPickerPanel } from "@/components/magic/TrackPickerPanel";
import { usePlayer } from "@/components/PlayerProvider";
import { useTheme } from "@/components/ThemeProvider";
import { useListTracks } from "@/hooks/queries/useListTracks";
import { useWaveform } from "@/hooks/queries/useWaveform";
import { assetUrl } from "@/lib/cdn";
import { formatDuration } from "@/lib/time";

// How long the fly in/out transition takes, kept in sync with the
// `duration-300` transition class below so the exit unmount timer matches
// what's actually on screen.
const TRANSITION_MS = 300;

// The single persistent player, present on every route: a compact bar when
// collapsed (playback stays reachable no matter where you navigate), which
// opens into a full-screen skinned drawer — now-playing widget, queue, and
// track picker — instead of navigating to a dedicated page. Folds together
// what used to be MiniPlayer + the /player route.
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
    playQueue,
    playAt,
    reorderQueue,
    removeFromQueue,
    clearQueue,
    next,
    prev,
    isPlayerExpanded,
    openPlayer,
    closePlayer,
  } = usePlayer();
  const { skinId, skin, skins, setSkinId } = useTheme();

  const shouldShow = !!currentTrack;
  // Stay mounted for one extra transition cycle after shouldShow goes false
  // so the exit animation can play instead of the bar just vanishing.
  const [mounted, setMounted] = useState(shouldShow);
  const [entered, setEntered] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  useEffect(() => {
    if (shouldShow) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    setQueueOpen(false);
    const timeout = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [shouldShow]);

  const { data: tracks } = useListTracks();
  const allTracks = useMemo(
    () =>
      (tracks ?? []).map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        audioSrc: assetUrl(t.audioFile),
        artworkSrc: assetUrl(t.artworkFile),
        duration: t.duration,
      })),
    [tracks],
  );

  const onTogglePlay = useCallback(() => {
    if (currentTrack) toggle(currentTrack);
  }, [currentTrack, toggle]);

  // Only fetched while the drawer's open — the queue-position visualizer is
  // the only consumer of peaks.
  const { data: peaks = [] } = useWaveform(isPlayerExpanded ? currentTrack?.id : undefined);

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

  const SkinComponent = skin.Component;
  const theme = skin.theme;
  const progress = currentTrack?.duration ? Math.min(1, currentTime / currentTrack.duration) : 0;

  // The collapsed bar only makes sense once something's playing; the
  // expanded drawer can still be opened with nothing playing (e.g. from the
  // navbar) to offer the track picker as a quick-start list.
  if (!isPlayerExpanded && (!mounted || !currentTrack)) return null;

  return (
    <>
      {mounted && currentTrack && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md transition-all duration-300 ease-out ${
            isPlayerExpanded
              ? "translate-y-24 opacity-0 pointer-events-none"
              : entered
                ? "translate-y-0 opacity-100"
                : "translate-y-24 opacity-0"
          }`}
        >
          {/* biome-ignore lint/a11y/useSemanticElements: contains a nested play/pause <button>, so the outer control can't itself be a <button> */}
          <div
            role="button"
            tabIndex={0}
            onClick={openPlayer}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPlayer();
              }
            }}
            aria-label="Open player"
            className="rounded-box bg-base-300 shadow-lg overflow-hidden cursor-pointer"
          >
            <div className="relative flex items-center gap-3 p-2 pr-2">
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
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(currentTrack);
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="btn btn-ghost btn-circle btn-sm shrink-0"
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

              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {currentTrack.title}
              </span>

              <span className="text-xs tabular-nums text-base-content/60 shrink-0">
                {formatDuration(currentTime)} / {formatDuration(currentTrack.duration)}
              </span>

              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQueueOpen((v) => !v);
                  }}
                  aria-label={queueOpen ? "Hide queue" : "Show queue"}
                  aria-expanded={queueOpen}
                  className="btn btn-ghost btn-circle btn-sm shrink-0"
                >
                  {queueOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              )}

              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-base-content/10 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>

            {queueOpen && queue.length > 0 && (
              <ul className="max-h-64 overflow-y-auto border-t border-base-content/10">
                {queue.map((t, i) => {
                  const isCurrent = i === queueIndex;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAt(i);
                        }}
                        className={`flex w-full items-center gap-2.5 px-2 py-1.5 text-left transition-colors ${
                          isCurrent ? "bg-base-content/10" : "hover:bg-base-content/5"
                        }`}
                      >
                        <span className="w-4 shrink-0 text-center text-xs tabular-nums text-base-content/50">
                          {isCurrent && isPlaying ? (
                            <Pause className="mx-auto w-3 h-3" fill="currentColor" />
                          ) : isCurrent ? (
                            <Play className="mx-auto w-3 h-3" fill="currentColor" />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <span className="relative w-7 h-7 shrink-0 rounded overflow-hidden bg-base-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={t.artworkSrc}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${isCurrent ? "font-semibold" : ""}`}
                        >
                          {t.title}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-base-content/40">
                          {formatDuration(t.duration)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {isPlayerExpanded && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center bg-black overflow-y-auto p-4 pb-24">
          {/* Ambient backdrop from the artwork, blurred, so the void isn't flat. */}
          {currentTrack && (
            <div
              aria-hidden
              className="fixed inset-0 opacity-25 blur-3xl scale-125"
              style={{
                backgroundImage: `url(${currentTrack.artworkSrc})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          <div className="relative z-10 flex flex-col items-center gap-6 my-auto py-6 w-full">
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
                peaks={peaks}
                onTogglePlay={onTogglePlay}
                onSeek={seek}
                onVolumeChange={setVolume}
                formatTime={formatDuration}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-white/70">
                <ListMusic className="h-8 w-8 text-white/40" />
                <p className="text-lg font-semibold">Nothing playing</p>
                <p className="text-sm text-white/50">Pick a track to play.</p>
              </div>
            )}

            {!currentTrack && allTracks.length > 0 && (
              <TrackPickerPanel
                items={allTracks}
                theme={theme}
                formatTime={formatDuration}
                onPlay={(index) => playQueue(allTracks, index)}
              />
            )}

            {queueItems.length > 0 && (
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
                onTogglePlay={onTogglePlay}
                onNext={next}
                onPrev={prev}
                onRemove={(index) => {
                  const track = queue[index];
                  if (track) removeFromQueue(track.id);
                }}
                onClear={clearQueue}
              />
            )}
          </div>

          {/* Skin picker, pinned bottom-center and themed to the active skin.
              Always shown, including the empty state, so the listener can
              dress the player before anything's playing. */}
          <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
            <SkinSelector skins={skins} activeId={skinId} theme={theme} onSelect={setSkinId} />
          </div>

          <button
            type="button"
            onClick={closePlayer}
            aria-label="Close player"
            className="fixed top-4 left-4 z-20 flex items-center gap-1 text-xs text-white/50 hover:text-white/90 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </button>
        </div>
      )}
    </>
  );
}
