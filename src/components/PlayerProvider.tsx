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

// Persist enough of the player to resume where the listener left off after a
// reload: the queue, which track was current, and how far into it they were.
// isPlaying is deliberately not stored — restored playback starts paused (and
// browsers block autoplay anyway), so the listener presses play to resume.
const STORAGE_KEY = "mix-vault:player";
// How often the current time is written out while playing. Frequent enough to
// resume close to where they were, infrequent enough to stay off the hot path.
const TIME_SAVE_INTERVAL_MS = 5000;

interface PersistedPlayer {
  queue: PlayerTrack[];
  currentTrack: PlayerTrack | null;
  currentTime: number;
}

function loadPersisted(): PersistedPlayer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPlayer;
    if (!parsed || !Array.isArray(parsed.queue)) return null;
    return {
      queue: parsed.queue,
      currentTrack: parsed.currentTrack ?? null,
      currentTime: typeof parsed.currentTime === "number" ? parsed.currentTime : 0,
    };
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedPlayer) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable (private mode) — persistence is best-effort.
  }
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
  const currentTimeRef = useRef(0);
  // Time to seek to once the restored track's metadata has loaded — the
  // <audio> element ignores currentTime until it knows the media's duration.
  const pendingSeekRef = useRef<number | null>(null);
  // Guards the persistence effects from writing during the first render, so a
  // fresh (empty) state can't clobber what we're about to hydrate from storage.
  const hydratedRef = useRef(false);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Restore the last session's queue and position on mount. Runs once, before
  // the persistence effects are allowed to write (hydratedRef).
  useEffect(() => {
    const saved = loadPersisted();
    if (saved && saved.currentTrack) {
      queueRef.current = saved.queue;
      setQueueState(saved.queue);
      currentTrackRef.current = saved.currentTrack;
      setCurrentTrack(saved.currentTrack);
      pendingSeekRef.current = saved.currentTime;
      currentTimeRef.current = saved.currentTime;
      setCurrentTime(saved.currentTime);
    }
    hydratedRef.current = true;
  }, []);

  // Persist the queue and current track whenever either changes. currentTime
  // rides along using its latest value; the interval below keeps it fresh.
  useEffect(() => {
    if (!hydratedRef.current) return;
    savePersisted({ queue, currentTrack, currentTime: currentTimeRef.current });
  }, [queue, currentTrack]);

  // While something is playing, write the current time out every few seconds
  // so a reload resumes close to where the listener was.
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    const id = window.setInterval(() => {
      savePersisted({
        queue: queueRef.current,
        currentTrack: currentTrackRef.current,
        currentTime: currentTimeRef.current,
      });
    }, TIME_SAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isPlaying, currentTrack]);

  // Flush the current position when the tab is closed, hidden, or navigated
  // away from, so we don't lose up to a whole save interval on exit. pagehide
  // is used over unload — it fires reliably on mobile and with the bfcache.
  useEffect(() => {
    const flush = () => {
      if (!currentTrackRef.current) return;
      savePersisted({
        queue: queueRef.current,
        currentTrack: currentTrackRef.current,
        currentTime: currentTimeRef.current,
      });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

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
        onLoadedMetadata={(e) => {
          // Apply a restored position once the element can accept a seek.
          const pending = pendingSeekRef.current;
          if (pending != null) {
            pendingSeekRef.current = null;
            if (pending > 0 && pending < e.currentTarget.duration) {
              e.currentTarget.currentTime = pending;
              setCurrentTime(pending);
            }
          }
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
      />
    </PlayerContext.Provider>
  );
}
