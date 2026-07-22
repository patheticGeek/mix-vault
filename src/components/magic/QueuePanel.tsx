"use client";

import type { SkinTheme } from "@/components/magic/types";
import { GripVertical, ListMusic, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useRef, useState } from "react";

export interface QueuePanelItem {
  id: string;
  title: string;
  artworkSrc: string;
  duration: number;
}

interface QueuePanelProps {
  items: QueuePanelItem[];
  currentIndex: number;
  isPlaying: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  theme: SkinTheme;
  formatTime: (seconds: number) => string;
  onSelect: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
}

// A neutral translucent hover that reads on both light (iPod) and dark skins,
// so we don't have to derive an alpha from each theme's accent color.
const HOVER_BG = "rgba(128,128,128,0.18)";

// The queue / playlist, rendered in the active skin's palette rather than a
// single fixed style, and reorderable by dragging rows. Purely presentational
// — all mutations go back out through the callbacks.
export function QueuePanel({
  items,
  currentIndex,
  isPlaying,
  hasNext,
  hasPrev,
  theme,
  formatTime,
  onSelect,
  onReorder,
  onTogglePlay,
  onNext,
  onPrev,
}: QueuePanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  // The source index also lives in a ref so onDrop reads the live value even
  // if it fires in the same tick as onDragStart (no re-render in between).
  const dragIndexRef = useRef<number | null>(null);

  function resetDrag() {
    dragIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
  }

  const transportBtn = "rounded p-1 disabled:opacity-25 transition-opacity";

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
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderBottom: theme.border }}
      >
        <span
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
          style={{ color: theme.textMuted }}
        >
          <ListMusic className="h-3.5 w-3.5" />
          Queue
          <span style={{ opacity: 0.6 }}>· {items.length}</span>
        </span>
        <div className="flex items-center" style={{ color: theme.text }}>
          <button type="button" onClick={onPrev} disabled={!hasPrev} aria-label="Previous track" className={transportBtn}>
            <SkipBack className="h-4 w-4" fill="currentColor" />
          </button>
          <button type="button" onClick={onTogglePlay} disabled={items.length === 0} aria-label={isPlaying ? "Pause" : "Play"} className={transportBtn}>
            {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
          </button>
          <button type="button" onClick={onNext} disabled={!hasNext} aria-label="Next track" className={transportBtn}>
            <SkipForward className="h-4 w-4" fill="currentColor" />
          </button>
        </div>
      </div>

      <ul className="max-h-72 overflow-y-auto">
        {items.map((t, i) => {
          const isCurrent = i === currentIndex;
          const isDropTarget = overIndex === i && dragIndex !== null && dragIndex !== i;
          const background = isCurrent ? theme.accent : hoverIndex === i ? HOVER_BG : "transparent";
          const color = isCurrent ? theme.accentText : theme.text;
          return (
            <li key={t.id}>
              <button
                type="button"
                draggable
                onClick={() => onSelect(i)}
                onDragStart={(e) => {
                  dragIndexRef.current = i;
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIndexRef.current;
                  if (from !== null) onReorder(from, i);
                  resetDrag();
                }}
                onDragEnd={resetDrag}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((h) => (h === i ? null : h))}
                className="flex w-full items-center gap-2.5 px-2 py-2 text-left transition-colors"
                style={{
                  background,
                  color,
                  borderTop: isDropTarget ? `2px solid ${theme.accent}` : "2px solid transparent",
                  cursor: "grab",
                  opacity: dragIndex === i ? 0.4 : 1,
                }}
              >
                <GripVertical className="h-3.5 w-3.5 shrink-0" style={{ opacity: 0.4 }} />
                <span className="w-4 shrink-0 text-center text-xs tabular-nums" style={{ opacity: 0.7 }}>
                  {isCurrent && isPlaying ? (
                    <Pause className="mx-auto h-3 w-3" fill="currentColor" />
                  ) : isCurrent ? (
                    <Play className="mx-auto h-3 w-3" fill="currentColor" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded" style={{ background: "rgba(128,128,128,0.2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.artworkSrc} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm" style={{ fontWeight: isCurrent ? 600 : 400 }}>
                  {t.title}
                </span>
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
