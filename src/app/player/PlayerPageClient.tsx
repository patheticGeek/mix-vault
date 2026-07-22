"use client";

import { usePlayer } from "@/components/PlayerProvider";
import { QueuePanel, type QueuePanelItem } from "@/components/magic/QueuePanel";
import { SkinSelector } from "@/components/magic/SkinSelector";
import { TrackPickerPanel } from "@/components/magic/TrackPickerPanel";
import { DEFAULT_SKIN_ID, SKINS, getSkin } from "@/components/magic/skins";
import { useListTracks } from "@/hooks/queries/useListTracks";
import { useWaveform } from "@/hooks/queries/useWaveform";
import { assetUrl } from "@/lib/cdn";
import { formatDuration } from "@/lib/time";
import { ArrowLeft, ListMusic } from "lucide-react";
import { useRouter } from "next/navigation";
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
    playQueue,
    playAt,
    reorderQueue,
    removeFromQueue,
    clearQueue,
    next,
    prev,
  } = usePlayer();

  const router = useRouter();
  // Go back to wherever the user came from. Falls back to the homepage when
  // /player was opened directly (no in-app history to return to).
  const handleBack = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  // The full track list, offered as the quick-start picker when nothing is
  // queued yet.
  const { data: tracks } = useListTracks();
  const allTracks = useMemo(
    () =>
      (tracks ?? []).map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        audioSrc: assetUrl(t.audioFile),
        artworkSrc: assetUrl(t.artworkFile),
        duration: t.duration,
      })),
    [tracks],
  );

  const [skinId, setSkinId] = useState(DEFAULT_SKIN_ID);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(SKIN_STORAGE_KEY)
        : null;
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

  // The queue no longer carries peaks, so fetch the waveform for whatever's
  // playing to feed the skin's visualizer.
  const { data: peaks = [] } = useWaveform(currentTrack?.id);

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
            peaks={peaks}
            onTogglePlay={onTogglePlay}
            onSeek={seek}
            onVolumeChange={setVolume}
            formatTime={formatDuration}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-white/70">
            <ListMusic className="h-8 w-8 text-white/40" />
            <p className="text-lg font-semibold">Nothing playing</p>
            <p className="text-sm text-white/50">Pick a track to play.</p>
          </div>
        )}

        {/* Nothing queued yet: offer the whole library as a quick-start list so
            the listener can kick something off without leaving the player. */}
        {!currentTrack && allTracks.length > 0 && (
          <TrackPickerPanel
            items={allTracks}
            theme={theme}
            formatTime={formatDuration}
            onPlay={(index) => playQueue(allTracks, index)}
          />
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
            onRemove={(index) => {
              const track = queue[index];
              if (track) removeFromQueue(track.id);
            }}
            onClear={clearQueue}
          />
        )}
      </div>

      {/* Skin picker, pinned bottom-center and themed to the active skin.
          Always shown, including the empty state, so the listener can dress
          the player before anything's playing. */}
      <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
        <SkinSelector
          skins={SKINS}
          activeId={skinId}
          theme={theme}
          onSelect={selectSkin}
        />
      </div>

      {/* Subtle escape hatch — back to whatever page the user came from. */}
      <button
        type="button"
        onClick={handleBack}
        className="fixed top-4 left-4 z-20 flex items-center gap-1 text-xs text-white/50 hover:text-white/90 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>
    </div>
  );
}
