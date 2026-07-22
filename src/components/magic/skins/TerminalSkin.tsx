"use client";

import type { WinampSkinProps } from "@/components/magic/types";
import { useRef } from "react";

// A retro CRT terminal skin: green phosphor on black, monospace everything,
// blinking cursor, ASCII progress bar and VU meter — like driving cmus/ncmpcpp
// from the command line. Purely presentational; only uses WinampSkinProps.
const GLYPHS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

export function TerminalSkin({
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
  const seekRef = useRef<HTMLSpanElement>(null);

  function handleSeek(e: React.MouseEvent<HTMLSpanElement>) {
    const el = seekRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    onSeek(Math.min(1, Math.max(0, fraction)));
  }

  // ASCII progress bar: [####----]
  const BAR_WIDTH = 28;
  const filled = Math.round(progress * BAR_WIDTH);
  const barText = "#".repeat(filled) + "-".repeat(BAR_WIDTH - filled);

  // VU meter: down-sample peaks to fixed columns, map amplitude -> block glyph.
  const COLS = 20;
  const vu = Array.from({ length: COLS }, (_, i) => {
    const v = peaks.length === 0 ? 0.08 : peaks[Math.floor((i / COLS) * peaks.length)] ?? 0;
    return GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(v * GLYPHS.length))];
  }).join("");

  const green = "#33ff66";
  const status = isBuffering ? "buffering" : isPlaying ? "playing" : "paused";

  return (
    <div
      className="relative select-none font-mono overflow-hidden"
      style={{
        width: "min(92vw, 440px)",
        background: "#020a04",
        border: `1px solid ${green}`,
        borderRadius: 6,
        boxShadow: `0 0 24px rgba(51,255,102,0.25), inset 0 0 40px rgba(51,255,102,0.06)`,
        color: green,
        textShadow: "0 0 4px rgba(51,255,102,0.7)",
        padding: 14,
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      {/* Scanlines + subtle flicker overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-pulse"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 1px, transparent 1px, transparent 3px)",
          animationDuration: "6s",
          mixBlendMode: "multiply",
        }}
      />

      <div className="relative">
        {/* Header / prompt */}
        <div className="flex items-center justify-between opacity-80" style={{ fontSize: 10 }}>
          <span>mix-vault@crt:~$ play</span>
          <span>[{status}]</span>
        </div>

        <hr className="my-2 border-0 border-t" style={{ borderColor: "rgba(51,255,102,0.3)" }} />

        {/* Now playing */}
        <div className="flex gap-2 items-start">
          <div
            className="shrink-0 overflow-hidden"
            style={{ width: 48, height: 48, border: `1px solid ${green}`, background: "#000" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={track.artworkSrc}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: "grayscale(1) sepia(1) hue-rotate(70deg) saturate(3) contrast(1.1)" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate" style={{ fontWeight: 700 }}>
              &gt; {track.title}
              <span className="animate-pulse">_</span>
            </div>
            {track.artist && (
              <div className="truncate opacity-70" style={{ fontSize: 11 }}>
                artist: {track.artist}
              </div>
            )}
          </div>
        </div>

        {/* VU meter */}
        <div
          className="mt-3 whitespace-pre overflow-hidden"
          style={{ opacity: isPlaying ? 1 : 0.5, letterSpacing: 1 }}
        >
          vu |{vu}|
        </div>

        {/* ASCII seek/progress bar. Only the inner bar (between the brackets)
            is the click target, so a click maps to exactly the spot under the
            cursor instead of the full-width row. */}
        <div className="mt-2 whitespace-pre" style={{ letterSpacing: 1 }}>
          [
          <span
            ref={seekRef}
            onClick={handleSeek}
            className="inline-block cursor-pointer align-baseline"
            role="slider"
            aria-label="Seek"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {barText}
          </span>
          ]
        </div>

        {/* Time */}
        <div className="mt-1 flex justify-between opacity-80" style={{ fontSize: 11 }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(track.duration)}</span>
        </div>

        <hr className="my-2 border-0 border-t" style={{ borderColor: "rgba(51,255,102,0.3)" }} />

        {/* Transport + volume */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="active:translate-y-px"
            style={{
              border: `1px solid ${green}`,
              background: "transparent",
              color: green,
              padding: "2px 10px",
              borderRadius: 3,
              textShadow: "inherit",
            }}
          >
            {isBuffering ? "[...]" : isPlaying ? "[ pause ]" : "[ play ]"}
          </button>

          <div className="flex items-center gap-1 flex-1" style={{ fontSize: 11 }}>
            <span className="opacity-70">vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              aria-label="Volume"
              className="w-full"
              style={{ accentColor: green, height: 14 }}
            />
            <span className="opacity-70 tabular-nums" style={{ width: 32, textAlign: "right" }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
