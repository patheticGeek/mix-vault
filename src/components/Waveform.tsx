"use client";

interface WaveformProps {
  peaks: number[];
  progress?: number;
  onSeek?: (fraction: number) => void;
  className?: string;
  height?: string;
}

export function Waveform({ peaks, progress = 0, onSeek, className = "", height = "h-16" }: WaveformProps) {
  const playedCount = Math.round(progress * peaks.length);

  return (
    <div
      className={`flex items-end gap-px w-full ${height} ${onSeek ? "cursor-pointer" : ""} ${className}`}
      onClick={(e) => {
        if (!onSeek) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = (e.clientX - rect.left) / rect.width;
        onSeek(Math.min(1, Math.max(0, fraction)));
      }}
    >
      {peaks.map((peak, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${i < playedCount ? "bg-primary" : "bg-base-content/20"}`}
          style={{ height: `${Math.max(peak * 100, 2)}%` }}
        />
      ))}
    </div>
  );
}
