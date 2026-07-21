"use client";

import { usePlayer } from "@/components/PlayerProvider";
import { formatDuration } from "@/lib/time";
import { Loader2, Pause, Play } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// How long the fly in/out transition takes, kept in sync with the
// `duration-300` transition class below so the exit unmount timer matches
// what's actually on screen.
const TRANSITION_MS = 300;

// Stands in for a track's inline player when it isn't visible — either
// because we've navigated away from it or it's scrolled out of view — so
// playback that's still going stays reachable from anywhere in the app.
export function MiniPlayer() {
  const { currentTrack, isPlaying, currentTime, isBuffering, isCurrentVisible, toggle } = usePlayer();
  const shouldShow = !!currentTrack && !isCurrentVisible;

  // Stay mounted for one extra transition cycle after shouldShow goes false
  // so the exit animation can play instead of the player just vanishing.
  const [mounted, setMounted] = useState(shouldShow);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (shouldShow) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const timeout = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [shouldShow]);

  if (!mounted || !currentTrack) return null;

  const progress = currentTrack.duration ? currentTime / currentTrack.duration : 0;
  const title = (
    <span className="min-w-0 flex-1 truncate text-sm font-medium">{currentTrack.title}</span>
  );

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md transition-all duration-300 ease-out ${
        entered ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
      }`}
    >
      <div className="relative flex items-center gap-3 rounded-box bg-base-300 shadow-lg p-2 pr-4 overflow-hidden">
        <div className="relative w-10 h-10 shrink-0 rounded overflow-hidden bg-base-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentTrack.artworkSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>

        <button
          type="button"
          onClick={() => toggle(currentTrack)}
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

        {currentTrack.slug ? (
          <Link href={`/track/${currentTrack.slug}`} className="contents">
            {title}
          </Link>
        ) : (
          title
        )}

        <span className="text-xs tabular-nums text-base-content/60 shrink-0">
          {formatDuration(currentTime)} / {formatDuration(currentTrack.duration)}
        </span>

        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-base-content/10 rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
