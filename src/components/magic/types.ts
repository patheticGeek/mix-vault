// A small palette each theme exposes so the shared queue panel can render in
// that theme's look instead of a single neutral style. Values are raw CSS, so
// gradients and rgba() are fine.
export interface SkinTheme {
  // font-family applied across the chrome.
  fontFamily: string;
  // Panel background (color or gradient).
  surface: string;
  // Full CSS `border` shorthand for panels/rows.
  border: string;
  // Primary and secondary text colors.
  text: string;
  textMuted: string;
  // Highlight color for the active row / selected option, and text on it.
  accent: string;
  accentText: string;
  // border-radius for panels.
  radius: string;
}

export interface MagicSkin {
  // Stable id used for persistence and the ?skin= query param. kebab-case.
  id: string;
  // Human-facing name shown in the theme switcher.
  name: string;
  // Optional one-line flavor text for the switcher.
  description?: string;
  // Palette the shared queue panel renders itself in, and the daisyUI theme
  // this skin maps to across the whole site (see globals.css).
  theme: SkinTheme;
}
