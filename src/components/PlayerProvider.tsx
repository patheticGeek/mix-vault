"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface PlayerTrack {
  id: string;
  slug?: string;
  title: string;
  audioSrc: string;
  artworkSrc: string;
  duration: number;
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
  // Start a track. This resets the queue to just that one track — building a
  // longer queue is done through addToQueue / playNext.
  play: (track: PlayerTrack) => void;
  pause: () => void;
  toggle: (track: PlayerTrack) => void;
  seek: (fraction: number) => void;
  setVolume: (volume: number) => void;
  // Replace the queue with a fresh list and start playing at startIndex —
  // used by "play all".
  playQueue: (tracks: PlayerTrack[], startIndex?: number) => void;
  // Play the track at the given index of the *current* queue, without
  // rebuilding the queue (unlike play).
  playAt: (index: number) => void;
  // Append a track to the end of the queue (starts it if nothing's playing).
  addToQueue: (track: PlayerTrack) => void;
  // Insert a track right after the current one so it plays next.
  playNext: (track: PlayerTrack) => void;
  // Reorder the queue (drag-and-drop): move the entry at `from` to `to`.
  reorderQueue: (from: number, to: number) => void;
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

  // Update both the queue state and its ref in one place, so ref-reading
  // callbacks (next/prev/auto-advance) always see the latest list.
  const commitQueue = useCallback((tracks: PlayerTrack[]) => {
    queueRef.current = tracks;
    setQueueState(tracks);
  }, []);

  // Starting a track is what defines the queue: it becomes a queue of just
  // that one track. Building a longer queue is done deliberately, through
  // addToQueue / playNext.
  const play = useCallback(
    (track: PlayerTrack) => {
      if (currentTrackRef.current?.id !== track.id) setCurrentTime(0);
      commitQueue([track]);
      setCurrentTrack(track);
      setIsPlaying(true);
    },
    [commitQueue],
  );

  // Replace the queue with a whole list and start playing at startIndex —
  // the "play all" entry point.
  const playQueue = useCallback(
    (tracks: PlayerTrack[], startIndex = 0) => {
      const track = tracks[startIndex];
      if (!track) return;
      commitQueue(tracks);
      if (currentTrackRef.current?.id !== track.id) setCurrentTime(0);
      setCurrentTrack(track);
      setIsPlaying(true);
    },
    [commitQueue],
  );

  const pause = useCallback(() => setIsPlaying(false), []);

  const toggle = useCallback(
    (track: PlayerTrack) => {
      // Same track: just flip play/pause and leave the queue as-is.
      if (currentTrackRef.current?.id === track.id) {
        setIsPlaying((p) => !p);
        return;
      }
      play(track);
    },
    [play],
  );

  // Play a specific position in the *current* queue without rebuilding it —
  // used by the queue list, so clicking an entry doesn't collapse the queue
  // down to that one track the way play() would.
  const playAt = useCallback((index: number) => {
    const track = queueRef.current[index];
    if (!track) return;
    if (currentTrackRef.current?.id !== track.id) setCurrentTime(0);
    setCurrentTrack(track);
    setIsPlaying(true);
  }, []);

  // Append to the end of the queue. With nothing playing yet, there's no
  // queue to append to, so it just starts the track.
  const addToQueue = useCallback((track: PlayerTrack) => {
    const q = queueRef.current;
    if (q.length === 0 || !currentTrackRef.current) {
      commitQueue([track]);
      setCurrentTime(0);
      setCurrentTrack(track);
      setIsPlaying(true);
      return;
    }
    if (q.some((t) => t.id === track.id)) return; // already queued
    commitQueue([...q, track]);
  }, [commitQueue]);

  // Insert right after the current track so it plays next. Same empty-queue
  // fallback as addToQueue.
  const playNext = useCallback((track: PlayerTrack) => {
    const q = queueRef.current;
    if (q.length === 0 || !currentTrackRef.current) {
      commitQueue([track]);
      setCurrentTime(0);
      setCurrentTrack(track);
      setIsPlaying(true);
      return;
    }
    if (q.some((t) => t.id === track.id)) return; // already queued
    const idx = q.findIndex((t) => t.id === currentTrackRef.current?.id);
    const at = idx < 0 ? q.length : idx + 1;
    commitQueue([...q.slice(0, at), track, ...q.slice(at)]);
  }, [commitQueue]);

  // Move a queue entry from one position to another (drag-and-drop reorder).
  const reorderQueue = useCallback((from: number, to: number) => {
    const q = queueRef.current;
    if (from === to || from < 0 || to < 0 || from >= q.length || to >= q.length) return;
    const nextQueue = [...q];
    const [moved] = nextQueue.splice(from, 1);
    nextQueue.splice(to, 0, moved);
    commitQueue(nextQueue);
  }, [commitQueue]);

  // Move `offset` steps through the queue relative to the current track,
  // starting playback there. Returns whether it actually moved, so callers
  // (like auto-advance) can decide what to do at the ends.
  const playAtOffset = useCallback((offset: number) => {
    const q = queueRef.current;
    const idx = q.findIndex((t) => t.id === currentTrackRef.current?.id);
    const target = idx + offset;
    if (idx < 0 || target < 0 || target >= q.length) return false;
    playAt(target);
    return true;
  }, [playAt]);

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

  const discard = useCallback(
    (id: string) => {
      if (currentTrackRef.current?.id !== id) return;
      setCurrentTrack(null);
      setIsPlaying(false);
      setCurrentTime(0);
      commitQueue([]);
    },
    [commitQueue],
  );

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
      playQueue,
      playAt,
      addToQueue,
      playNext,
      reorderQueue,
      next,
      prev,
      setVisible,
      discard,
    }),
    [currentTrack, isPlaying, currentTime, isBuffering, volume, isCurrentVisible, queue, queueIndex, hasNext, hasPrev, play, pause, toggle, seek, setVolume, playQueue, playAt, addToQueue, playNext, reorderQueue, next, prev, setVisible, discard],
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
