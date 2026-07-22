"use client";

import type { MagicSkin, SkinTheme } from "@/components/magic/types";
import { Check, ChevronUp } from "lucide-react";
import { useState } from "react";

interface SkinSelectorProps {
  skins: MagicSkin[];
  activeId: string;
  theme: SkinTheme;
  onSelect: (id: string) => void;
}

const HOVER_BG = "rgba(128,128,128,0.18)";

// The skin picker, rendered as a dropdown in the active skin's palette. Opens
// upward because it lives pinned to the bottom-center of the player page.
export function SkinSelector({ skins, activeId, theme, onSelect }: SkinSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const active = skins.find((s) => s.id === activeId) ?? skins[0];

  return (
    <div className="relative" style={{ fontFamily: theme.fontFamily }}>
      {/* Click-away layer while open. */}
      {open && <button type="button" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-0 cursor-default" />}

      {open && (
        <ul
          className="absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 overflow-hidden shadow-xl"
          style={{ background: theme.surface, border: theme.border, borderRadius: theme.radius, color: theme.text }}
        >
          {skins.map((s) => {
            const isActive = s.id === activeId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(s.id);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHoverId(s.id)}
                  onMouseLeave={() => setHoverId((h) => (h === s.id ? null : h))}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors"
                  style={{
                    background: isActive ? theme.accent : hoverId === s.id ? HOVER_BG : "transparent",
                    color: isActive ? theme.accentText : theme.text,
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {s.name}
                  {isActive && <Check className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative z-10 flex items-center gap-2 px-4 py-1.5 text-sm shadow-lg"
        style={{ background: theme.surface, border: theme.border, borderRadius: theme.radius, color: theme.text }}
      >
        <span style={{ color: theme.textMuted }} className="text-xs uppercase tracking-wider">
          Skin
        </span>
        <span className="font-semibold">{active.name}</span>
        <ChevronUp className={`h-4 w-4 transition-transform ${open ? "" : "rotate-180"}`} style={{ color: theme.textMuted }} />
      </button>
    </div>
  );
}
