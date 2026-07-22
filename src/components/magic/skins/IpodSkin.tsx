"use client";

import type { WinampSkinProps } from "@/components/magic/types";
import { FastForward, Menu, Pause, Play, Rewind } from "lucide-react";
import { useRef } from "react";

// A classic click-wheel iPod. Silver/white plastic body, a rectangular LCD at
// the top with artwork + title + a Nano-style progress bar and times, and a big
// circular click wheel below (MENU / rewind / fast-forward / play-pause + center
// select). Only uses props from WinampSkinProps.
export function IpodSkin({
  track,
  isPlaying,
  isBuffering,
  currentTime,
  progress,
  volume,
  peaks,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  formatTime,
}: WinampSkinProps) {
  const seekRef = useRef<HTMLDivElement>(null);

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const el = seekRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onSeek(clamp((e.clientX - rect.left) / rect.width));
  }
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const nudge = (delta: number) => onSeek(clamp(progress + delta));

  // Tiny now-playing EQ driven by real peaks; flat fallback when empty.
  const BARS = 5;
  const eq = Array.from({ length: BARS }, (_, i) => {
    if (peaks.length === 0) return 0.35;
    const idx = Math.floor(((currentTime * 3 + i) % peaks.length + peaks.length) % peaks.length);
    return peaks[idx] ?? 0.3;
  });

  return (
    <div
      className="select-none"
      style={{
        width: "min(88vw, 300px)",
        background: "linear-gradient(160deg, #fafafa 0%, #e6e7ea 45%, #cfd1d6 100%)",
        border: "1px solid #b6b8bd",
        boxShadow:
          "0 18px 50px rgba(0,0,0,0.55), inset 0 2px 2px rgba(255,255,255,0.9), inset 0 -3px 6px rgba(0,0,0,0.12)",
        borderRadius: 26,
        padding: 16,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* LCD screen */}
      <div
        style={{
          background: "linear-gradient(180deg, #e9f0ef 0%, #d5e0e0 100%)",
          border: "1px solid #9aa0a2",
          borderRadius: 6,
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25)",
          padding: 8,
          color: "#1c2a33",
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between mb-2" style={{ fontSize: 9, color: "#3a4c57" }}>
          <span className="flex items-center gap-1">
            {isPlaying ? <Play className="w-2.5 h-2.5" fill="currentColor" /> : <Pause className="w-2.5 h-2.5" fill="currentColor" />}
            <span className="font-semibold tracking-wide">{isBuffering ? "Buffering…" : "Now Playing"}</span>
          </span>
          <span className="flex items-end gap-[2px]" style={{ height: 12 }} aria-hidden>
            {eq.map((v, i) => (
              <span
                key={i}
                style={{
                  width: 2,
                  height: `${Math.max(15, (isPlaying ? v : 0.15) * 100)}%`,
                  background: "#2e7d5b",
                  transition: "height 200ms ease",
                }}
              />
            ))}
          </span>
        </div>

        <div className="flex gap-2">
          <div
            className="shrink-0 overflow-hidden"
            style={{ width: 54, height: 54, borderRadius: 3, border: "1px solid #8c9296", background: "#000" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={track.artworkSrc} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="truncate font-semibold" style={{ fontSize: 12 }}>
              {track.title}
            </div>
            {track.artist && (
              <div className="truncate" style={{ fontSize: 10, opacity: 0.7 }}>
                {track.artist}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar (clickable seek) */}
        <div className="mt-2">
          <div
            ref={seekRef}
            onClick={handleSeek}
            className="relative cursor-pointer"
            style={{
              height: 8,
              background: "#c3ccce",
              border: "1px solid #8c9296",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              className="h-full"
              style={{ width: `${progress * 100}%`, background: "linear-gradient(180deg, #7fbfe0, #3f8fc0)" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1" style={{ fontSize: 9, color: "#3a4c57" }}>
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(Math.max(0, track.duration - currentTime))}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1 mt-1.5">
          <span style={{ fontSize: 8, color: "#3a4c57" }}>VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Volume"
            className="w-full accent-[#3f8fc0]"
            style={{ height: 10 }}
          />
        </div>
      </div>

      {/* Click wheel */}
      <div className="flex justify-center mt-5 mb-1">
        <div
          className="relative"
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 35%, #fdfdfd 0%, #e7e8eb 60%, #d0d2d7 100%)",
            border: "1px solid #b6b8bd",
            boxShadow: "inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -4px 8px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          {/* MENU */}
          <button
            type="button"
            onClick={() => nudge(0)}
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 font-semibold active:opacity-60"
            style={{ top: 14, fontSize: 11, color: "#6b6e73", letterSpacing: 1 }}
            aria-label="Menu"
          >
            <Menu className="w-3 h-3" /> MENU
          </button>

          {/* Rewind (seek back ~5%) */}
          <button
            type="button"
            onClick={() => nudge(-0.05)}
            className="absolute top-1/2 -translate-y-1/2 active:opacity-60"
            style={{ left: 16, color: "#6b6e73" }}
            aria-label="Rewind"
          >
            <Rewind className="w-5 h-5" fill="currentColor" />
          </button>

          {/* Fast-forward (seek forward ~5%) */}
          <button
            type="button"
            onClick={() => nudge(0.05)}
            className="absolute top-1/2 -translate-y-1/2 active:opacity-60"
            style={{ right: 16, color: "#6b6e73" }}
            aria-label="Fast forward"
          >
            <FastForward className="w-5 h-5" fill="currentColor" />
          </button>

          {/* Play / Pause (bottom) */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 active:opacity-60"
            style={{ bottom: 16, color: "#6b6e73" }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <Play className="w-4 h-4" fill="currentColor" />
            <Pause className="w-4 h-4" fill="currentColor" />
          </button>

          {/* Center select -> toggle play */}
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center active:translate-y-[calc(-50%+1px)]"
            style={{
              width: 74,
              height: 74,
              borderRadius: "50%",
              background: "radial-gradient(circle at 50% 35%, #fefefe 0%, #e2e3e7 70%, #cfd1d6 100%)",
              border: "1px solid #b0b2b7",
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.25)",
              color: "#6b6e73",
            }}
          >
            {isBuffering ? (
              <span className="animate-pulse" style={{ fontSize: 12 }}>
                •••
              </span>
            ) : isPlaying ? (
              <Pause className="w-5 h-5" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 translate-x-px" fill="currentColor" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
