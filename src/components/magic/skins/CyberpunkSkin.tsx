"use client";

import type { WinampSkinProps } from "@/components/magic/types";
import { Loader2, Pause, Play } from "lucide-react";
import { useRef } from "react";

// A neon cyberpunk HUD: near-black chrome with vivid cyan + magenta glow,
// scanlines, glitchy angular framing and a waveform driven by real peaks.
export function CyberpunkSkin({
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
    const fraction = (e.clientX - rect.left) / rect.width;
    onSeek(Math.min(1, Math.max(0, fraction)));
  }

  const BAR_COUNT = 22;
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    if (peaks.length === 0) return 0.12 + 0.1 * Math.abs(Math.sin(i * 1.3));
    const idx = Math.floor((i / BAR_COUNT) * peaks.length);
    return peaks[idx] ?? 0;
  });
  const playedBars = Math.floor(progress * BAR_COUNT);

  const cyan = "#00f0ff";
  const magenta = "#ff2bd6";

  return (
    <div
      className="relative select-none overflow-hidden font-mono text-[#c9faff]"
      style={{
        width: "min(92vw, 440px)",
        background: "linear-gradient(160deg, #0a0e17 0%, #0d0518 100%)",
        border: `1px solid ${cyan}`,
        clipPath: "polygon(0 0, 100% 0, 100% 90%, 94% 100%, 0 100%)",
        boxShadow: `0 0 24px rgba(0,240,255,0.35), 0 0 60px rgba(255,43,214,0.15), inset 0 0 30px rgba(0,240,255,0.06)`,
        padding: 14,
      }}
    >
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 2px, transparent 3px)",
          mixBlendMode: "overlay",
        }}
      />

      {/* Header */}
      <div className="mb-3 flex items-center justify-between text-[10px] tracking-[0.35em]">
        <span style={{ color: cyan, textShadow: `0 0 8px ${cyan}` }}>MIXVAULT//SYS</span>
        <span
          className="animate-pulse"
          style={{ color: magenta, textShadow: `0 0 8px ${magenta}` }}
        >
          {isBuffering ? "BUFFER" : isPlaying ? "● LIVE" : "◌ IDLE"}
        </span>
      </div>

      {/* Artwork + track meta */}
      <div className="mb-3 flex gap-3">
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            width: 64,
            height: 64,
            border: `1px solid ${magenta}`,
            boxShadow: `0 0 14px ${magenta}88`,
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 12% 100%, 0 82%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={track.artworkSrc} alt="" className="h-full w-full object-cover" style={{ filter: "saturate(1.3) contrast(1.1)" }} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div
            className="truncate text-sm font-bold uppercase tracking-wider"
            style={{ color: "#fff", textShadow: `0 0 10px ${cyan}` }}
          >
            {track.title}
          </div>
          {track.artist && (
            <div className="truncate text-xs" style={{ color: magenta, textShadow: `0 0 8px ${magenta}88` }}>
              {track.artist}
            </div>
          )}
          <div className="mt-1 flex justify-between text-[11px] tracking-widest" style={{ color: cyan }}>
            <span style={{ textShadow: `0 0 6px ${cyan}` }}>{formatTime(currentTime)}</span>
            <span className="opacity-50">{formatTime(track.duration)}</span>
          </div>
        </div>
      </div>

      {/* Visualizer */}
      <div
        className="mb-3 flex items-end gap-[2px]"
        style={{ height: 40, borderBottom: `1px solid ${cyan}44`, paddingBottom: 2 }}
      >
        {bars.map((v, i) => {
          const lit = i <= playedBars;
          return (
            <div
              key={i}
              className="flex-1 transition-[height] duration-150"
              style={{
                height: `${Math.max(8, v * 100)}%`,
                background: lit
                  ? `linear-gradient(180deg, ${cyan}, ${magenta})`
                  : `linear-gradient(180deg, ${cyan}33, ${magenta}22)`,
                boxShadow: lit ? `0 0 8px ${cyan}` : "none",
                opacity: isPlaying ? 1 : 0.5,
              }}
            />
          );
        })}
      </div>

      {/* Seek bar */}
      <div
        ref={seekRef}
        onClick={handleSeek}
        className="relative mb-4 cursor-pointer"
        style={{ height: 8, background: "#050810", border: `1px solid ${cyan}55` }}
      >
        <div
          className="h-full"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${magenta}, ${cyan})`,
            boxShadow: `0 0 10px ${cyan}`,
          }}
        />
        <div
          className="absolute top-1/2 h-3 w-1 -translate-y-1/2"
          style={{
            left: `calc(${progress * 100}% - 2px)`,
            background: "#fff",
            boxShadow: `0 0 8px ${cyan}, 0 0 12px ${magenta}`,
          }}
        />
      </div>

      {/* Transport + volume */}
      <div className="relative z-20 flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex items-center justify-center active:translate-y-px"
          style={{
            width: 46,
            height: 30,
            background: "linear-gradient(180deg, #10182a, #08040f)",
            border: `1px solid ${cyan}`,
            color: cyan,
            boxShadow: `0 0 12px ${cyan}66, inset 0 0 8px ${cyan}22`,
            clipPath: "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)",
          }}
        >
          {isBuffering ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
          )}
        </button>

        <div className="flex flex-1 items-center gap-2">
          <span className="text-[9px] tracking-widest" style={{ color: magenta }}>
            VOL
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Volume"
            className="h-3 w-full"
            style={{ accentColor: cyan }}
          />
        </div>
      </div>
    </div>
  );
}
