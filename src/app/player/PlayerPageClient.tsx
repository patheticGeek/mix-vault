"use client";

import { usePlayer } from "@/components/PlayerProvider";
import { QueuePanel, type QueuePanelItem } from "@/components/magic/QueuePanel";
import { SkinSelector } from "@/components/magic/SkinSelector";
import { DEFAULT_SKIN_ID, SKINS, getSkin } from "@/components/magic/skins";
import { formatDuration } from "@/lib/time";
import { ArrowLeft, ListMusic } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const SKIN_STORAGE_KEY = "mix-vault:magic-skin";

// The full-screen skinnable player. It isn't tied to a slug: it reflects
// whatever the shared PlayerProvider is playing and shows the queue that
// playback moves through. The queue is built elsewhere — playing a track
// starts a queue of one; "add to queue" / "play next" (on the homepage and
// track pages) grow it — so this page just renders and reorders it.
export function PlayerPageClient() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    isBuffering,
    volume,
    queue,
    queueIndex,
    hasNext,
    hasPrev,
    toggle,
    seek,
    setVolume,
    playAt,
    reorderQueue,
    next,
    prev,
  } = usePlayer();

  const [skinId, setSkinId] = useState(DEFAULT_SKIN_ID);

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

  const queueItems = useMemo<QueuePanelItem[]>(
    () =>
      queue.map((t) => ({
        id: t.id,
        title: t.title,
        artworkSrc: t.artworkSrc,
        duration: t.duration,
      })),
    [queue],
  );

  const skin = getSkin(skinId);
  const SkinComponent = skin.Component;
  const theme = skin.theme;

  const progress = currentTrack?.duration
    ? Math.min(1, currentTime / currentTrack.duration)
    : 0;

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-black overflow-y-auto p-4 pb-24">
      {/* Ambient backdrop from the artwork, blurred, so the void isn't flat. */}
      {currentTrack && (
        <div
          aria-hidden
          className="fixed inset-0 opacity-25 blur-3xl scale-125"
          style={{
            backgroundImage: `url(${currentTrack.artworkSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-6 my-auto py-6 w-full">
        {currentTrack ? (
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
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-white/70">
            <ListMusic className="h-8 w-8 text-white/40" />
            <p className="text-lg font-semibold">Nothing playing</p>
            <p className="text-sm text-white/50">
              Play a track, or add one to the queue from the{" "}
              <Link href="/" className="underline hover:text-white">
                track list
              </Link>
              .
            </p>
          </div>
        )}

        {queueItems.length > 0 && (
          <QueuePanel
            items={queueItems}
            currentIndex={queueIndex}
            isPlaying={isPlaying}
            hasNext={hasNext}
            hasPrev={hasPrev}
            theme={theme}
            formatTime={formatDuration}
            onSelect={playAt}
            onReorder={reorderQueue}
            onTogglePlay={onTogglePlay}
            onNext={next}
            onPrev={prev}
          />
        )}
      </div>

      {/* Skin picker, pinned bottom-center and themed to the active skin. */}
      {currentTrack && (
        <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
          <SkinSelector skins={SKINS} activeId={skinId} theme={theme} onSelect={selectSkin} />
        </div>
      )}

      {/* Subtle escape hatch — back to the current track's page when we know
          it, otherwise to the homepage. */}
      <Link
        href={currentTrack?.slug ? `/track/${currentTrack.slug}` : "/"}
        className="fixed top-4 left-4 z-20 flex items-center gap-1 text-xs text-white/50 hover:text-white/90 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>
    </div>
  );
}
