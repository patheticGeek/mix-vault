// The contract every "magic" player skin implements. A skin is a purely
// presentational component: it receives the full player state and a set of
// callbacks, and renders a Winamp-style UI however it likes. It never talks
// to the PlayerProvider, react-query, or the network directly — everything
// it needs arrives through these props. That keeps each skin fully
// self-contained and independently authorable (see skins/index.ts).

export interface MagicSkinTrack {
  title: string;
  // Optional secondary line (e.g. artist / mix name). May be undefined.
  artist?: string;
  // Absolute URL to cover art, ready to drop into an <img src>.
  artworkSrc: string;
  // Total length in seconds. Can be 0 before metadata loads.
  duration: number;
}

export interface MagicQueueItem {
  id: string;
  title: string;
  artworkSrc: string;
  duration: number;
}

// A small palette each skin exposes so the shared player chrome — the queue
// panel and the skin selector — can render in that skin's look instead of a
// single neutral style. Values are raw CSS, so gradients and rgba() are fine.
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

export interface WinampSkinProps {
  track: MagicSkinTrack;

  // --- Live playback state ---
  isPlaying: boolean;
  // True while the audio is stalled/buffering — show a spinner or "buffering".
  isBuffering: boolean;
  // Current playhead position in seconds.
  currentTime: number;
  // Convenience: currentTime / duration, clamped to 0..1 (0 when no duration).
  progress: number;
  // Current output volume, 0..1.
  volume: number;
  // Waveform amplitude samples, each 0..1. May be an empty array if the
  // track has no precomputed waveform — skins should handle that gracefully
  // (e.g. fall back to a flat bar or a fake animated visualizer).
  peaks: number[];

  // --- Controls (all no-argument-safe to call) ---
  // Play if paused, pause if playing.
  onTogglePlay: () => void;
  // Seek to a fraction of the track, 0..1.
  onSeek: (fraction: number) => void;
  // Set output volume, 0..1.
  onVolumeChange: (volume: number) => void;

  // --- Helpers ---
  // Formats a seconds value as "m:ss" (e.g. 75 -> "1:15"). Returns "--:--"
  // for non-finite/negative input.
  formatTime: (seconds: number) => string;
}

export interface MagicSkin {
  // Stable id used for persistence and the ?skin= query param. kebab-case.
  id: string;
  // Human-facing name shown in the skin switcher.
  name: string;
  // Optional one-line flavor text for the switcher.
  description?: string;
  // Palette the shared queue panel + skin selector render themselves in.
  theme: SkinTheme;
  // The skin component itself.
  Component: React.ComponentType<WinampSkinProps>;
}
