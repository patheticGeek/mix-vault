"use client";

interface WaveformProps {
  peaks: number[];
  progress?: number;
  onSeek?: (fraction: number) => void;
  className?: string;
}

export function Waveform({ peaks, progress = 0, onSeek, className = "" }: WaveformProps) {
  const playedCount = Math.round(progress * peaks.length);
  // Peaks are raw amplitude (0-1), but few mixes actually reach full scale —
  // normalizing against the loudest peak in this track makes the bars use
  // the available height instead of looking uniformly quiet/short.
  const maxPeak = Math.max(...peaks, 0.0001);

  return (
    <div
      className={`flex items-center gap-px h-12 w-full ${onSeek ? "cursor-pointer" : ""} ${className}`}
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
          style={{ height: `${Math.max((peak / maxPeak) * 100, 2)}%` }}
        />
      ))}
    </div>
  );
}
