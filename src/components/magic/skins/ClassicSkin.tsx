"use client";

import type { WinampSkinProps } from "@/components/magic/types";
import { Pause, Play } from "lucide-react";
import { useRef } from "react";

// The reference skin. A faithful-ish nod to the original Winamp: dark
// gunmetal chrome, a green LCD readout, a spectrum-analyzer-style bar
// visualizer driven by the track's real waveform peaks, and classic
// transport + volume controls. Also serves as the worked example other
// skins are modeled on — it only uses the props from WinampSkinProps.
export function ClassicSkin({
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

  // Down-sample the peaks to a fixed set of analyzer bars. When there are no
  // peaks we still render bars (flat) so the layout doesn't collapse.
  const BAR_COUNT = 20;
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    if (peaks.length === 0) return 0.08;
    const idx = Math.floor((i / BAR_COUNT) * peaks.length);
    return peaks[idx] ?? 0;
  });
  const playedBars = Math.floor(progress * BAR_COUNT);

  return (
    <div
      className="select-none font-mono"
      style={{
        width: "min(92vw, 420px)",
        background: "linear-gradient(180deg, #3a3a44 0%, #23232a 100%)",
        border: "2px solid #14141a",
        borderTop: "2px solid #55555f",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
        borderRadius: 4,
        padding: 10,
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-2 mb-2"
        style={{
          height: 18,
          background: "linear-gradient(180deg, #4b4b57 0%, #2c2c34 100%)",
          borderRadius: 2,
          fontSize: 10,
          letterSpacing: 1,
          color: "#9a9aa5",
          textShadow: "0 1px 0 #000",
        }}
      >
        <span>MIX VAULT — MAGIC PLAYER</span>
        <span style={{ color: "#00ff5f" }}>{isPlaying ? "▶" : "❚❚"}</span>
      </div>

      {/* LCD readout + artwork */}
      <div className="flex gap-2 mb-2">
        <div
          className="shrink-0 overflow-hidden"
          style={{ width: 56, height: 56, border: "1px solid #14141a", borderRadius: 2, background: "#000" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={track.artworkSrc} alt="" className="w-full h-full object-cover" />
        </div>
        <div
          className="flex-1 min-w-0 flex flex-col justify-between px-2 py-1"
          style={{
            background: "#0b1e12",
            border: "1px inset #0a3a1e",
            borderRadius: 2,
            color: "#22ff77",
            textShadow: "0 0 6px rgba(34,255,119,0.6)",
          }}
        >
          <div className="truncate" style={{ fontSize: 12, fontWeight: 700 }}>
            {track.title}
          </div>
          {track.artist && (
            <div className="truncate" style={{ fontSize: 10, opacity: 0.75 }}>
              {track.artist}
            </div>
          )}
          <div className="flex items-center justify-between" style={{ fontSize: 14, letterSpacing: 1 }}>
            <span>{formatTime(currentTime)}</span>
            <span style={{ opacity: 0.6 }}>{formatTime(track.duration)}</span>
          </div>
        </div>
      </div>

      {/* Spectrum analyzer */}
      <div
        className="flex items-end gap-[2px] mb-2 px-2"
        style={{ height: 34, background: "#05100a", border: "1px inset #0a3a1e", borderRadius: 2, paddingTop: 4, paddingBottom: 4 }}
      >
        {bars.map((v, i) => (
          <div
            key={i}
            className="flex-1 transition-[height] duration-150"
            style={{
              height: `${Math.max(6, v * 100)}%`,
              background:
                i <= playedBars
                  ? "linear-gradient(180deg, #b6ff00 0%, #22ff77 60%, #00994d 100%)"
                  : "linear-gradient(180deg, #1c5c34 0%, #0d3a20 100%)",
              opacity: isPlaying ? 1 : 0.65,
            }}
          />
        ))}
      </div>

      {/* Seek bar */}
      <div
        ref={seekRef}
        onClick={handleSeek}
        className="relative mb-3 cursor-pointer"
        style={{ height: 10, background: "#14141a", border: "1px inset #000", borderRadius: 2 }}
      >
        <div
          className="h-full"
          style={{
            width: `${progress * 100}%`,
            background: "linear-gradient(180deg, #55d 0%, #229 100%)",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{
            left: `calc(${progress * 100}% - 4px)`,
            width: 8,
            height: 14,
            background: "linear-gradient(180deg, #ddd, #888)",
            border: "1px solid #000",
            borderRadius: 2,
          }}
        />
      </div>

      {/* Transport + volume */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex items-center justify-center active:translate-y-px"
          style={{
            width: 44,
            height: 28,
            background: "linear-gradient(180deg, #55555f 0%, #2c2c34 100%)",
            border: "1px solid #14141a",
            borderTop: "1px solid #6a6a75",
            borderRadius: 3,
            color: "#e6e6ee",
          }}
        >
          {isPlaying ? (
            isBuffering ? (
              <span className="animate-pulse" style={{ fontSize: 10 }}>
                •••
              </span>
            ) : (
              <Pause className="w-4 h-4" fill="currentColor" />
            )
          ) : (
            <Play className="w-4 h-4 translate-x-px" fill="currentColor" />
          )}
        </button>

        <div className="flex items-center gap-1 flex-1">
          <span style={{ fontSize: 9, color: "#9a9aa5" }}>VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Volume"
            className="w-full accent-[#22ff77]"
            style={{ height: 14 }}
          />
        </div>
      </div>
    </div>
  );
}
