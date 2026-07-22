"use client";

import { usePlayer } from "@/components/PlayerProvider";
import { DEFAULT_SKIN_ID, SKINS, getSkin } from "@/components/magic/skins";
import { formatDuration } from "@/lib/time";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const SKIN_STORAGE_KEY = "mix-vault:magic-skin";

// The full-screen skinnable player. Unlike a track page it isn't tied to a
// slug and never fetches anything — it simply reflects whatever the shared
// PlayerProvider currently has playing, so it's a global "now playing" view.
export function PlayerPageClient() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    isBuffering,
    volume,
    toggle,
    seek,
    setVolume,
  } = usePlayer();

  const [skinId, setSkinId] = useState(DEFAULT_SKIN_ID);

  // Restore the last-used skin client-side only, so SSR renders the
  // deterministic default and there's no hydration mismatch.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(SKIN_STORAGE_KEY) : null;
    if (stored && SKINS.some((s) => s.id === stored)) setSkinId(stored);
  }, []);

  const selectSkin = useCallback((id: string) => {
    setSkinId(id);
    try {
      localStorage.setItem(SKIN_STORAGE_KEY, id);
    } catch {
      // storage may be unavailable (private mode) — fine, just don't persist
    }
  }, []);

  const onTogglePlay = useCallback(() => {
    if (currentTrack) toggle(currentTrack);
  }, [currentTrack, toggle]);

  const skin = getSkin(skinId);
  const SkinComponent = skin.Component;

  // Nothing playing: this page has no track of its own to fall back to.
  if (!currentTrack) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-black text-center text-white/80">
        <p className="text-lg font-semibold">Nothing playing</p>
        <p className="text-sm text-white/50">Start a track and it&apos;ll show up here.</p>
        <Link href="/" className="btn btn-sm btn-ghost text-white">
          Browse tracks
        </Link>
      </div>
    );
  }

  const progress = currentTrack.duration
    ? Math.min(1, currentTime / currentTrack.duration)
    : 0;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black overflow-hidden p-4">
      {/* Ambient backdrop from the artwork, blurred, so the void isn't flat. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-25 blur-3xl scale-125"
        style={{
          backgroundImage: `url(${currentTrack.artworkSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <SkinComponent
          track={{
            title: currentTrack.title,
            artist: undefined,
            artworkSrc: currentTrack.artworkSrc,
            duration: currentTrack.duration,
          }}
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          currentTime={currentTime}
          progress={progress}
          volume={volume}
          peaks={currentTrack.peaks ?? []}
          onTogglePlay={onTogglePlay}
          onSeek={seek}
          onVolumeChange={setVolume}
          formatTime={formatDuration}
        />

        {/* Skin switcher — the one always-present chrome, kept deliberately
            minimal so it never competes with the skin itself. */}
        <div className="flex flex-wrap items-center justify-center gap-1">
          {SKINS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSkin(s.id)}
              title={s.description}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                s.id === skinId
                  ? "border-white/80 bg-white/90 text-black"
                  : "border-white/25 text-white/70 hover:border-white/50 hover:text-white"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Subtle escape hatch — back to the track's page when we know it,
          otherwise to the homepage. */}
      <Link
        href={currentTrack.slug ? `/track/${currentTrack.slug}` : "/"}
        className="absolute top-4 left-4 z-10 flex items-center gap-1 text-xs text-white/50 hover:text-white/90 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>
    </div>
  );
}
