import type { MagicSkin } from "@/components/magic/types";
import { ClassicSkin } from "@/components/magic/skins/ClassicSkin";
import { CyberpunkSkin } from "@/components/magic/skins/CyberpunkSkin";
import { TerminalSkin } from "@/components/magic/skins/TerminalSkin";
import { VaporwaveSkin } from "@/components/magic/skins/VaporwaveSkin";
import { IpodSkin } from "@/components/magic/skins/IpodSkin";

// The registry of available player skins. Order here is the order shown in
// the switcher; the first entry is the default. Each skin is a self-contained
// component implementing WinampSkinProps — adding one is just dropping a file
// in this folder and appending an entry below. The `theme` palette lets the
// shared chrome (queue panel + skin selector) match the skin's look.
export const SKINS: MagicSkin[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The original Winamp gunmetal-and-LCD look.",
    theme: {
      fontFamily: "monospace",
      surface: "linear-gradient(180deg,#3a3a44,#23232a)",
      border: "1px solid #14141a",
      text: "#e6e6ee",
      textMuted: "#9a9aa5",
      accent: "#22ff77",
      accentText: "#05100a",
      radius: "3px",
    },
    Component: ClassicSkin,
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Blade Runner neon HUD with glowing cyan and magenta.",
    theme: {
      fontFamily: "monospace",
      surface: "rgba(6,10,18,0.92)",
      border: "1px solid rgba(34,211,238,0.4)",
      text: "#c9f7ff",
      textMuted: "rgba(120,200,220,0.7)",
      accent: "#22d3ee",
      accentText: "#04121a",
      radius: "2px",
    },
    Component: CyberpunkSkin,
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Green-phosphor CRT terminal with an ASCII VU meter.",
    theme: {
      fontFamily: "monospace",
      surface: "#05100a",
      border: "1px solid #124a28",
      text: "#22ff77",
      textMuted: "#1c9c54",
      accent: "#22ff77",
      accentText: "#05100a",
      radius: "0px",
    },
    Component: TerminalSkin,
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    description: "80s retrowave sunset, chrome text, and a neon grid.",
    theme: {
      fontFamily: "system-ui, sans-serif",
      surface: "linear-gradient(180deg, rgba(60,20,90,0.9), rgba(30,10,50,0.92))",
      border: "1px solid rgba(255,95,208,0.5)",
      text: "#ffe6ff",
      textMuted: "rgba(230,180,255,0.7)",
      accent: "#ff5fd0",
      accentText: "#2a0a3a",
      radius: "12px",
    },
    Component: VaporwaveSkin,
  },
  {
    id: "ipod",
    name: "iPod",
    description: "Classic click-wheel iPod with an LCD now-playing screen.",
    theme: {
      fontFamily: "system-ui, sans-serif",
      surface: "#f4f4f5",
      border: "1px solid #d4d4d8",
      text: "#18181b",
      textMuted: "#71717a",
      accent: "#3b82f6",
      accentText: "#ffffff",
      radius: "10px",
    },
    Component: IpodSkin,
  },
];

export const DEFAULT_SKIN_ID = SKINS[0].id;

export function getSkin(id: string | null | undefined): MagicSkin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
