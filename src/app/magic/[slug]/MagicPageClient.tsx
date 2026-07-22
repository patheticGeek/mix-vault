"use client";

import { usePlayer } from "@/components/PlayerProvider";
import { DEFAULT_SKIN_ID, SKINS, getSkin } from "@/components/magic/skins";
import { useTrackBySlug, type TrackBySlugResponse } from "@/hooks/queries/useTrackBySlug";
import { assetUrl } from "@/lib/cdn";
import { formatDuration } from "@/lib/time";
import { parsePeaks } from "@/lib/waveform";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const SKIN_STORAGE_KEY = "mix-vault:magic-skin";

interface MagicPageClientProps {
  slug: string;
  initialTrack?: TrackBySlugResponse | null;
}

// Hosts the skinnable "magic" player. It owns the real playback (through the
// shared PlayerProvider) and the choice of skin, then hands the live state
// down to whichever skin is selected. Skins themselves are dumb: they render
// what they're given and call the callbacks (see components/magic/types.ts).
export function MagicPageClient({ slug, initialTrack }: MagicPageClientProps) {
  const { data: track, isLoading } = useTrackBySlug(slug, initialTrack);
  const {
    currentTrack,
    isPlaying: playerIsPlaying,
    currentTime: playerCurrentTime,
    isBuffering: playerIsBuffering,
    volume,
    toggle,
    seek,
    setVolume,
  } = usePlayer();

  const [skinId, setSkinId] = useState(DEFAULT_SKIN_ID);

  // Restore the last-used skin. Runs client-side only so SSR always renders
  // the deterministic default and there's no hydration mismatch.
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

  const isCurrent = Boolean(track) && currentTrack?.id === track?.id;
  const isPlaying = isCurrent && playerIsPlaying;
  const isBuffering = isCurrent && playerIsBuffering;
  const currentTime = isCurrent ? playerCurrentTime : 0;

  const peaks = useMemo(() => (track ? parsePeaks(track.waveformPreview) : []), [track]);

  const onTogglePlay = useCallback(() => {
    if (!track) return;
    toggle({
      id: track.id,
      slug: track.slug,
      title: track.title,
      audioSrc: assetUrl(track.audioFile),
      artworkSrc: assetUrl(track.artworkFile),
      duration: track.duration,
    });
  }, [track, toggle]);

  const onSeek = useCallback(
    (fraction: number) => {
      // Seeking only makes sense once this track is the active one; before
      // that there's no audio element position to move.
      if (isCurrent) seek(fraction);
    },
    [isCurrent, seek],
  );

  const skin = getSkin(skinId);
  const SkinComponent = skin.Component;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black overflow-hidden p-4">
      {/* Ambient backdrop from the artwork, blurred, so the void isn't flat. */}
      {track && (
        <div
          aria-hidden
          className="absolute inset-0 opacity-25 blur-3xl scale-125"
          style={{
            backgroundImage: `url(${assetUrl(track.artworkFile)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-6">
        {isLoading && !track && <span className="loading loading-spinner loading-lg text-white/70" />}

        {track === null && (
          <div className="text-center text-white/80">
            <p className="text-lg font-semibold">Track not found</p>
            <Link href="/" className="btn btn-sm btn-ghost mt-4 text-white">
              Back to all tracks
            </Link>
          </div>
        )}

        {track && (
          <SkinComponent
            track={{
              title: track.title,
              artist: undefined,
              artworkSrc: assetUrl(track.artworkFile),
              duration: track.duration,
            }}
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            currentTime={currentTime}
            progress={track.duration ? Math.min(1, currentTime / track.duration) : 0}
            volume={volume}
            peaks={peaks}
            onTogglePlay={onTogglePlay}
            onSeek={onSeek}
            onVolumeChange={setVolume}
            formatTime={formatDuration}
          />
        )}

        {/* Skin switcher — the one always-present chrome, kept deliberately
            minimal so it never competes with the skin itself. */}
        {track && (
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
        )}
      </div>

      {/* Subtle escape hatch back to the track page. */}
      {track && (
        <Link
          href={`/track/${track.slug}`}
          className="absolute top-4 left-4 z-10 flex items-center gap-1 text-xs text-white/50 hover:text-white/90 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>
      )}
    </div>
  );
}
