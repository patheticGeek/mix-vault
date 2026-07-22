"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface PlayerTrack {
  id: string;
  slug?: string;
  title: string;
  audioSrc: string;
  artworkSrc: string;
  duration: number;
  // Precomputed waveform amplitudes (0..1), carried along so the full-page
  // /player view can draw a real visualizer without re-fetching the track.
  // Optional because ephemeral sources (like a form preview) may not have it.
  peaks?: number[];
}

interface PlayerContextValue {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  isBuffering: boolean;
  // Playback volume in the 0..1 range, applied to the shared <audio>
  // element. Exposed so richer players (like the magic skins) can offer a
  // volume slider; the default inline players just leave it at 1.
  volume: number;
  // Whether the current track's own inline player (a list item or the track
  // page hero) is on screen somewhere right now — see useTrackVisibility.
  // The mini player only shows itself when this is false.
  isCurrentVisible: boolean;
  // The ordered list of tracks playback advances through, and the position
  // of the current track within it (-1 when the current track isn't part of
  // the queue). Populated by the /player view; empty elsewhere.
  queue: PlayerTrack[];
  queueIndex: number;
  hasNext: boolean;
  hasPrev: boolean;
  play: (track: PlayerTrack) => void;
  pause: () => void;
  toggle: (track: PlayerTrack) => void;
  seek: (fraction: number) => void;
  setVolume: (volume: number) => void;
  // Replace the queue without disturbing what's currently playing — lets a
  // page adopt a track list as the queue while playback keeps going.
  setQueue: (tracks: PlayerTrack[]) => void;
  // Replace the queue and start playing the track at startIndex.
  playQueue: (tracks: PlayerTrack[], startIndex: number) => void;
  // Advance to the next / previous track in the queue (no-op at the ends).
  next: () => void;
  prev: () => void;
  setVisible: (id: string, visible: boolean) => void;
  // Fully drops the current track rather than just pausing it, so nothing
  // is left for the mini player to pick up — for ephemeral playback (like a
  // track form's live preview) that shouldn't survive its page.
  discard: (id: string) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}

// Single <audio> element for the whole app, mounted here rather than per
// track, so playback survives navigating between pages instead of being
// torn down and recreated with each one.
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isCurrentVisible, setIsCurrentVisible] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueueState] = useState<PlayerTrack[]>([]);

  // Mirror the latest track/playing state into refs so the callbacks below
  // can stay referentially stable (no deps on state) instead of changing
  // identity on every play/pause/time tick.
  const currentTrackRef = useRef<PlayerTrack | null>(null);
  const isPlayingRef = useRef(false);
  const visibleIds = useRef<Set<string>>(new Set());
  const queueRef = useRef<PlayerTrack[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
    setIsCurrentVisible(currentTrack ? visibleIds.current.has(currentTrack.id) : false);
  }, [currentTrack]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // The <audio> element is the source of truth for whether it's actually
  // playing — autoplay restrictions, errors, or anything else outside our
  // control can pause/resume it. isPlaying only expresses what we'd *like*.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  const play = useCallback((track: PlayerTrack) => {
    if (currentTrackRef.current?.id !== track.id) setCurrentTime(0);
    setCurrentTrack(track);
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => setIsPlaying(false), []);

  const toggle = useCallback((track: PlayerTrack) => {
    if (currentTrackRef.current?.id === track.id && isPlayingRef.current) {
      setIsPlaying(false);
      return;
    }
    if (currentTrackRef.current?.id !== track.id) setCurrentTime(0);
    setCurrentTrack(track);
    setIsPlaying(true);
  }, []);

  // Swap the queue out from under playback without interrupting it — the
  // current track keeps playing and just gets relocated within the new list
  // (its index is derived from currentTrack, so nothing else to update).
  const setQueue = useCallback((tracks: PlayerTrack[]) => {
    queueRef.current = tracks;
    setQueueState(tracks);
  }, []);

  const playQueue = useCallback(
    (tracks: PlayerTrack[], startIndex: number) => {
      const track = tracks[startIndex];
      if (!track) return;
      queueRef.current = tracks;
      setQueueState(tracks);
      play(track);
    },
    [play],
  );

  // Move `offset` steps through the queue relative to the current track,
  // starting playback there. Returns whether it actually moved, so callers
  // (like auto-advance) can decide what to do at the ends.
  const playAtOffset = useCallback(
    (offset: number) => {
      const q = queueRef.current;
      const idx = q.findIndex((t) => t.id === currentTrackRef.current?.id);
      const target = idx + offset;
      if (idx < 0 || target < 0 || target >= q.length) return false;
      play(q[target]);
      return true;
    },
    [play],
  );

  const next = useCallback(() => {
    playAtOffset(1);
  }, [playAtOffset]);

  const prev = useCallback(() => {
    playAtOffset(-1);
  }, [playAtOffset]);

  // Keep the <audio> element's volume in sync. Clamped so callers can pass
  // a raw slider value without worrying about going out of range.
  const setVolume = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  // Re-apply volume whenever the element (re)mounts or the src swaps, since a
  // fresh media element resets to 1.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, currentTrack]);

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current;
    const track = currentTrackRef.current;
    if (!audio || !track) return;
    const time = fraction * track.duration;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVisible = useCallback((id: string, visible: boolean) => {
    if (visible) visibleIds.current.add(id);
    else visibleIds.current.delete(id);
    if (currentTrackRef.current?.id === id) {
      setIsCurrentVisible(visibleIds.current.has(id));
    }
  }, []);

  const discard = useCallback((id: string) => {
    if (currentTrackRef.current?.id !== id) return;
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  // Where the current track sits in the queue, and whether there's anywhere
  // to go from here. Derived (not stored) so it can never drift out of sync
  // with what's actually playing.
  const queueIndex = useMemo(
    () => (currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1),
    [queue, currentTrack],
  );
  const hasNext = queueIndex >= 0 && queueIndex < queue.length - 1;
  const hasPrev = queueIndex > 0;

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      isBuffering,
      volume,
      isCurrentVisible,
      queue,
      queueIndex,
      hasNext,
      hasPrev,
      play,
      pause,
      toggle,
      seek,
      setVolume,
      setQueue,
      playQueue,
      next,
      prev,
      setVisible,
      discard,
    }),
    [currentTrack, isPlaying, currentTime, isBuffering, volume, isCurrentVisible, queue, queueIndex, hasNext, hasPrev, play, pause, toggle, seek, setVolume, setQueue, playQueue, next, prev, setVisible, discard],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={currentTrack?.audioSrc}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsBuffering(false);
          setIsPlaying(false);
        }}
        onEnded={() => {
          setIsBuffering(false);
          // Roll onto the next queued track if there is one, otherwise stop.
          if (!playAtOffset(1)) setIsPlaying(false);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
      />
    </PlayerContext.Provider>
  );
}
