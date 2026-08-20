"use client";

interface WaveformProps {
  peaks: number[];
  progress?: number;
  onSeek?: (fraction: number) => void;
  className?: string;
}

export function Waveform({ peaks, progress = 0, onSeek, className = "" }: WaveformProps) {
  const exactPosition = Math.min(Math.max(progress, 0), 1) * peaks.length;
  const playedCount = Math.floor(exactPosition);
  // The bar the playhead is currently inside gets a blended grey/primary
  // color instead of snapping fully on, so progress reads as a bit softer
  // right at the edge rather than a hard cutoff.
  const currentIndex = Math.min(playedCount, peaks.length - 1);
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
      {peaks.map((peak, i) => {
        const barColor =
          i < currentIndex ? "bg-primary" : i === currentIndex ? "bg-primary/50" : "bg-base-content/20";
        return (
          <div
            key={i}
            className={`flex-1 rounded-sm ${barColor}`}
            style={{ height: `${Math.max((peak / maxPeak) * 100, 2)}%` }}
          />
        );
      })}
    </div>
  );
}
