"use client";

import { usePlayer } from "@/components/PlayerProvider";
import { formatDuration } from "@/lib/time";
import { ChevronDown, ChevronUp, Loader2, Pause, Play } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// How long the fly in/out transition takes, kept in sync with the
// `duration-300` transition class below so the exit unmount timer matches
// what's actually on screen.
const TRANSITION_MS = 300;

// Stands in for a track's inline player when it isn't visible — either
// because we've navigated away from it or it's scrolled out of view — so
// playback that's still going stays reachable from anywhere in the app.
// Tapping it opens the full /player; the chevron expands it into the queue.
export function MiniPlayer() {
  const { currentTrack, isPlaying, currentTime, isBuffering, queue, queueIndex, toggle, playAt } =
    usePlayer();
  const pathname = usePathname();
  const router = useRouter();
  // The /player page is its own full-screen player, so the floating mini
  // player would just be a redundant duplicate there — suppress it. Everywhere
  // else it stays put whenever something's playing, even when the track's own
  // inline player is on screen, so playback controls are always within reach.
  const onPlayerPage = pathname === "/player";
  const shouldShow = !!currentTrack && !onPlayerPage;

  // Stay mounted for one extra transition cycle after shouldShow goes false
  // so the exit animation can play instead of the player just vanishing.
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

  if (!mounted || !currentTrack) return null;

  const progress = currentTrack.duration ? currentTime / currentTrack.duration : 0;

  // Whole-card tap opens the full player; the interactive controls below stop
  // the event so they don't also navigate.
  function openPlayer() {
    router.push("/player");
  }

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md transition-all duration-300 ease-out ${
        entered ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
      }`}
    >
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
            <img src={currentTrack.artworkSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
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

          <span className="min-w-0 flex-1 truncate text-sm font-medium">{currentTrack.title}</span>

          <span className="text-xs tabular-nums text-base-content/60 shrink-0">
            {formatDuration(currentTime)} / {formatDuration(currentTrack.duration)}
          </span>

          {queue.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              aria-label={expanded ? "Hide queue" : "Show queue"}
              aria-expanded={expanded}
              className="btn btn-ghost btn-circle btn-sm shrink-0"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-base-content/10 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        {expanded && queue.length > 0 && (
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
                      <img src={t.artworkSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-sm ${isCurrent ? "font-semibold" : ""}`}>
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
  );
}
