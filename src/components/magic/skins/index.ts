import type { MagicSkin } from "@/components/magic/types";
import { ClassicSkin } from "@/components/magic/skins/ClassicSkin";
import { CyberpunkSkin } from "@/components/magic/skins/CyberpunkSkin";
import { TerminalSkin } from "@/components/magic/skins/TerminalSkin";
import { VaporwaveSkin } from "@/components/magic/skins/VaporwaveSkin";
import { IpodSkin } from "@/components/magic/skins/IpodSkin";

// The registry of available player skins. Order here is the order shown in
// the switcher; the first entry is the default. Each skin is a self-contained
// component implementing WinampSkinProps — adding one is just dropping a file
// in this folder and appending an entry below.
export const SKINS: MagicSkin[] = [
  {
    id: "classic",
    name: "Classic",
    description: "The original Winamp gunmetal-and-LCD look.",
    Component: ClassicSkin,
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Blade Runner neon HUD with glowing cyan and magenta.",
    Component: CyberpunkSkin,
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Green-phosphor CRT terminal with an ASCII VU meter.",
    Component: TerminalSkin,
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    description: "80s retrowave sunset, chrome text, and a neon grid.",
    Component: VaporwaveSkin,
  },
  {
    id: "ipod",
    name: "iPod",
    description: "Classic click-wheel iPod with an LCD now-playing screen.",
    Component: IpodSkin,
  },
];

export const DEFAULT_SKIN_ID = SKINS[0].id;

export function getSkin(id: string | null | undefined): MagicSkin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
