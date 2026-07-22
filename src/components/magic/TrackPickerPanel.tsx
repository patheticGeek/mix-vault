"use client";

import type { SkinTheme } from "@/components/magic/types";
import { ListMusic, Play } from "lucide-react";
import { useState } from "react";

export interface TrackPickerItem {
  id: string;
  title: string;
  artworkSrc: string;
  duration: number;
}

interface TrackPickerPanelProps {
  items: TrackPickerItem[];
  theme: SkinTheme;
  formatTime: (seconds: number) => string;
  // Start playback from the picked track. Index into `items`.
  onPlay: (index: number) => void;
}

// Same neutral hover as the queue panel, so it reads on both light and dark
// skins without deriving an alpha from each theme's accent.
const HOVER_BG = "rgba(128,128,128,0.18)";

// A quick-start track list shown on the /player page when nothing is queued
// yet: the whole library, click a row to start it. Rendered in the active
// skin's palette to match the queue panel, and purely presentational — the
// pick goes back out through onPlay.
export function TrackPickerPanel({ items, theme, formatTime, onPlay }: TrackPickerPanelProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  return (
    <div
      className="w-[min(92vw,440px)] overflow-hidden"
      style={{
        fontFamily: theme.fontFamily,
        background: theme.surface,
        border: theme.border,
        borderRadius: theme.radius,
        color: theme.text,
      }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider"
        style={{ borderBottom: theme.border, color: theme.textMuted }}
      >
        <ListMusic className="h-3.5 w-3.5" />
        All tracks
        <span style={{ opacity: 0.6 }}>· {items.length}</span>
      </div>

      <ul className="max-h-72 overflow-y-auto">
        {items.map((t, i) => {
          const isHovered = hoverIndex === i;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onPlay(i)}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((h) => (h === i ? null : h))}
                className="flex w-full items-center gap-2.5 px-2 py-2 text-left transition-colors"
                style={{ background: isHovered ? HOVER_BG : "transparent", color: theme.text }}
              >
                <span className="w-4 shrink-0 text-center text-xs tabular-nums" style={{ opacity: 0.7 }}>
                  {isHovered ? <Play className="mx-auto h-3 w-3" fill="currentColor" /> : i + 1}
                </span>
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded" style={{ background: "rgba(128,128,128,0.2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.artworkSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                <span className="shrink-0 text-xs tabular-nums" style={{ opacity: 0.6 }}>
                  {formatTime(t.duration)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
