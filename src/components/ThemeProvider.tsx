"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_SKIN_ID, getSkin, SKINS } from "@/components/magic/skins";
import type { MagicSkin } from "@/components/magic/types";

const SKIN_STORAGE_KEY = "mix-vault:magic-skin";

// One solid color per skin for the browser chrome (<meta name="theme-color">),
// which can't take the gradients some skins use for their panel surface.
const CHROME_COLOR: Record<string, string> = {
  classic: "#23232a",
  cyberpunk: "#06070a",
  terminal: "#05100a",
  vaporwave: "#1e0a32",
  ipod: "#ffffff",
};

interface ThemeContextValue {
  skinId: string;
  skin: MagicSkin;
  skins: MagicSkin[];
  setSkinId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

function applyDocumentTheme(id: string) {
  document.documentElement.dataset.theme = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", CHROME_COLOR[id] ?? CHROME_COLOR[DEFAULT_SKIN_ID]);
}

// Picking a skin re-themes the whole site (see globals.css: one daisyUI theme
// per skin) as well as the player widget itself. Selection is persisted to
// localStorage and applied to <html data-theme> — a blocking inline script in
// the root layout applies the stored value before first paint so there's no
// flash of the default theme.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [skinId, setSkinIdState] = useState(DEFAULT_SKIN_ID);

  useEffect(() => {
    const stored = window.localStorage.getItem(SKIN_STORAGE_KEY);
    if (stored && SKINS.some((s) => s.id === stored)) setSkinIdState(stored);
  }, []);

  const setSkinId = useCallback((id: string) => {
    setSkinIdState(id);
    applyDocumentTheme(id);
    try {
      window.localStorage.setItem(SKIN_STORAGE_KEY, id);
    } catch {
      // Storage full or unavailable (private mode) — persistence is best-effort.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ skinId, skin: getSkin(skinId), skins: SKINS, setSkinId }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Inlined into the root layout's <head> so the stored theme applies before
// first paint, avoiding a flash of the default ("classic") theme on reload.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var id = localStorage.getItem(${JSON.stringify(SKIN_STORAGE_KEY)});
    var known = ${JSON.stringify(SKINS.map((s) => s.id))};
    var colors = ${JSON.stringify(CHROME_COLOR)};
    if (id && known.indexOf(id) !== -1) {
      document.documentElement.setAttribute("data-theme", id);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta && colors[id]) meta.setAttribute("content", colors[id]);
    }
  } catch (e) {}
})();
`;
