"use client";

import type { WinampSkinProps } from "@/components/magic/types";
import { Pause, Play } from "lucide-react";
import { useRef } from "react";

// A E S T H E T I C. Hot pink + cyan + purple, chrome gradient title, a
// pulsing retro sun sinking into a neon grid horizon, glossy 80s Miami vibes.
// Purely presentational — only WinampSkinProps + lucide + react hooks.
export function VaporwaveSkin({
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

  const BAR_COUNT = 20;
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    if (peaks.length === 0) return 0.1;
    const idx = Math.floor((i / BAR_COUNT) * peaks.length);
    return peaks[idx] ?? 0;
  });

  return (
    <div
      className="vw-root select-none"
      style={{
        width: "min(92vw, 440px)",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        background: "linear-gradient(160deg, #2a0845 0%, #6441a5 45%, #1a1a3d 100%)",
        border: "1px solid rgba(255,113,206,0.5)",
        borderRadius: 14,
        padding: 12,
        boxShadow: "0 0 40px rgba(255,113,206,0.35), 0 12px 50px rgba(0,0,0,0.7)",
      }}
    >
      <style>{`
        @keyframes vw-spin { to { transform: rotate(360deg); } }
        @keyframes vw-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: .85; } }
        @keyframes vw-drift { from { background-position: 0 0; } to { background-position: 0 24px; } }
        @keyframes vw-shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .vw-chrome {
          background: linear-gradient(180deg,#fff 0%,#ffd1f5 25%,#8ef 50%,#c9a0ff 70%,#fff 100%);
          background-size: 100% 200%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: vw-shimmer 5s ease-in-out infinite;
        }
        .vw-title {
          background: linear-gradient(90deg,#ff71ce,#01cdfe,#b967ff,#ff71ce);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: vw-shimmer 6s linear infinite;
        }
      `}</style>

      {/* Title bar */}
      <div className="flex items-center justify-between px-1 mb-3">
        <span
          className="vw-chrome"
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: 4, textShadow: "0 0 8px rgba(1,205,254,.4)" }}
        >
          V A P O R W A V E
        </span>
        <span style={{ fontSize: 11, color: "#01cdfe", textShadow: "0 0 8px #01cdfe" }}>
          {isPlaying ? "▶ PLAYING" : "❚❚ PAUSED"}
        </span>
      </div>

      {/* Sunset + grid stage with artwork */}
      <div
        className="relative overflow-hidden mb-3"
        style={{ borderRadius: 10, border: "1px solid rgba(1,205,254,.4)", background: "linear-gradient(180deg,#3a0d5c 0%,#c31d80 55%,#ff9e6d 100%)" }}
      >
        {/* Pulsing sun */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 14,
            width: 92,
            height: 92,
            borderRadius: "50%",
            background: "linear-gradient(180deg,#fff59e 0%,#ff71ce 60%,#b967ff 100%)",
            boxShadow: "0 0 44px rgba(255,113,206,.8)",
            animation: "vw-pulse 3.5s ease-in-out infinite",
          }}
        />
        {/* Neon grid floor */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "45%",
            backgroundImage:
              "linear-gradient(rgba(1,205,254,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(1,205,254,.6) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            transform: "perspective(140px) rotateX(58deg)",
            transformOrigin: "bottom",
            animation: "vw-drift 1.6s linear infinite",
            // Freeze the grid in place while paused rather than resetting it.
            animationPlayState: isPlaying ? "running" : "paused",
          }}
        />
        {/* Artwork disc */}
        <div className="relative flex items-center justify-center py-6">
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid rgba(255,255,255,.85)",
              boxShadow: "0 0 26px rgba(1,205,254,.9)",
              // Keep the animation mounted and just pause it, so the disc holds
              // at its current angle instead of snapping back to 0° on pause.
              animation: "vw-spin 8s linear infinite",
              animationPlayState: isPlaying ? "running" : "paused",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={track.artworkSrc} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Track info */}
      <div className="text-center mb-3 px-1">
        <div className="vw-title truncate" style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>
          {track.title}
        </div>
        {track.artist && (
          <div className="truncate" style={{ fontSize: 12, color: "#01cdfe", textShadow: "0 0 6px rgba(1,205,254,.6)" }}>
            {track.artist}
          </div>
        )}
      </div>

      {/* Visualizer */}
      <div className="flex items-end justify-center gap-[3px] mb-3 px-1" style={{ height: 40 }}>
        {bars.map((v, i) => (
          <div
            key={i}
            className="flex-1 transition-[height] duration-150"
            style={{
              height: `${Math.max(8, v * 100)}%`,
              borderRadius: 2,
              background: "linear-gradient(180deg,#01cdfe 0%,#ff71ce 55%,#b967ff 100%)",
              boxShadow: "0 0 6px rgba(255,113,206,.5)",
              opacity: isPlaying ? 1 : 0.5,
            }}
          />
        ))}
      </div>

      {/* Seek bar */}
      <div
        ref={seekRef}
        onClick={handleSeek}
        className="relative mb-2 cursor-pointer"
        style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(1,205,254,.3)" }}
      >
        <div
          className="h-full"
          style={{ width: `${progress * 100}%`, borderRadius: 999, background: "linear-gradient(90deg,#01cdfe,#ff71ce,#b967ff)", boxShadow: "0 0 10px rgba(255,113,206,.8)" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `calc(${progress * 100}% - 6px)`, width: 12, height: 12, borderRadius: "50%", background: "#fff", boxShadow: "0 0 10px #01cdfe" }}
        />
      </div>

      {/* Times */}
      <div className="flex justify-between mb-3" style={{ fontSize: 11, color: "#ffd1f5", letterSpacing: 1 }}>
        <span>{formatTime(currentTime)}</span>
        <span style={{ opacity: 0.7 }}>{formatTime(track.duration)}</span>
      </div>

      {/* Transport + volume */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex items-center justify-center shrink-0 active:translate-y-px"
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            color: "#fff",
            background: "linear-gradient(180deg,#ff71ce 0%,#b967ff 100%)",
            border: "2px solid rgba(255,255,255,.7)",
            boxShadow: "0 0 20px rgba(255,113,206,.7)",
          }}
        >
          {isPlaying ? (
            isBuffering ? (
              <span className="animate-pulse" style={{ fontSize: 11, letterSpacing: 1 }}>
                •••
              </span>
            ) : (
              <Pause className="w-5 h-5" fill="currentColor" />
            )
          ) : (
            <Play className="w-5 h-5 translate-x-px" fill="currentColor" />
          )}
        </button>

        <div className="flex items-center gap-2 flex-1">
          <span style={{ fontSize: 9, color: "#01cdfe", letterSpacing: 1 }}>VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Volume"
            className="w-full accent-[#ff71ce]"
            style={{ height: 14 }}
          />
        </div>
      </div>
    </div>
  );
}
