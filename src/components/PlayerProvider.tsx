"use client";

import { apiClient } from "@/lib/api-client";
import { getOfflineArtworkUrl, getOfflineAudioUrl } from "@/lib/offline/downloads";
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
  // Drop a track from the queue by id — used when a track is deleted. If it's
  // the one currently playing, playback moves on to the next surviving track.
  removeFromQueue: (id: string) => void;
  // Empty the queue and stop playback entirely, returning to the "nothing
  // playing" state.
  clearQueue: () => void;
  // Advance to the next / previous track in the queue (no-op at the ends).
  next: () => void;
  prev: () => void;
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
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueueState] = useState<PlayerTrack[]>([]);
  // When the current track has been downloaded, this holds a blob URL for its
  // OPFS audio (tagged with the track id it belongs to). The <audio> src falls
  // back to the network URL whenever this doesn't match the current track.
  const [resolvedAudio, setResolvedAudio] = useState<{ id: string; src: string } | null>(null);
  // Object URLs currently handed to the element (audio + artwork), tracked so
  // they can be revoked when the track changes or the provider unmounts.
  const offlineUrlsRef = useRef<string[]>([]);
  // The current track's offline artwork blob URL, read by applyMediaMetadata.
  const offlineArtworkRef = useRef<{ id: string; url: string } | null>(null);

  // Mirror the latest track/playing state into refs so the callbacks below
  // can stay referentially stable (no deps on state) instead of changing
  // identity on every play/pause/time tick.
  const currentTrackRef = useRef<PlayerTrack | null>(null);
  const isPlayingRef = useRef(false);
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

  // Prune the queue down to the tracks that satisfy `keep`, used when tracks
  // are deleted (one at a time, or a whole batch found missing on restore). If
  // the current track is dropped, playback resumes from the nearest surviving
  // track at or after its old spot — otherwise the nearest one before it, and
  // if nothing's left, playback stops.
  const reconcileQueue = useCallback(
    (keep: (track: PlayerTrack) => boolean) => {
      const q = queueRef.current;
      const current = currentTrackRef.current;
      const currentKept = !current || keep(current);
      const nextQueue = q.filter(keep);
      // Nothing was removed and the current track survives — leave everything.
      if (nextQueue.length === q.length && currentKept) return;

      commitQueue(nextQueue);
      // Queue shrank but what's playing is fine — don't disturb playback.
      if (currentKept) return;

      const oldIdx = q.findIndex((t) => t.id === current!.id);
      let replacement: PlayerTrack | null = null;
      for (let i = oldIdx; i >= 0 && i < q.length; i++) {
        if (keep(q[i])) {
          replacement = q[i];
          break;
        }
      }
      if (!replacement) {
        for (let i = oldIdx - 1; i >= 0; i--) {
          if (keep(q[i])) {
            replacement = q[i];
            break;
          }
        }
      }

      // Moving off the deleted track: start the replacement from the top, and
      // drop any pending restore-seek since it belonged to the old track.
      pendingSeekRef.current = null;
      currentTimeRef.current = 0;
      setCurrentTime(0);
      if (!replacement) {
        setCurrentTrack(null);
        setIsPlaying(false);
        return;
      }
      setCurrentTrack(replacement);
    },
    [commitQueue],
  );

  const removeFromQueue = useCallback(
    (id: string) => {
      reconcileQueue((track) => track.id !== id);
    },
    [reconcileQueue],
  );

  // Wipe the queue and stop, dropping any pending restore-seek so it can't
  // reapply to a track that's no longer playing.
  const clearQueue = useCallback(() => {
    pendingSeekRef.current = null;
    currentTimeRef.current = 0;
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    commitQueue([]);
  }, [commitQueue]);

  // Once the restored session is in place, confirm its tracks still exist on
  // the server and drop any deleted since we last saved. Runs in the
  // background so it never delays resuming playback, and leaves the queue
  // untouched if the server can't be reached (so a blip doesn't wipe it).
  useEffect(() => {
    if (!currentTrackRef.current && queueRef.current.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiClient.api.tracks.$get();
        if (!res.ok) return;
        const rows = await res.json();
        if (cancelled) return;
        const validIds = new Set(rows.map((r) => r.id));
        reconcileQueue((track) => validIds.has(track.id));
      } catch {
        // Network/parse error — don't prune on a check we couldn't complete.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reconcileQueue]);

  // Where the current track sits in the queue, and whether there's anywhere
  // to go from here. Derived (not stored) so it can never drift out of sync
  // with what's actually playing.
  const queueIndex = useMemo(
    () => (currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1),
    [queue, currentTrack],
  );
  const hasNext = queueIndex >= 0 && queueIndex < queue.length - 1;
  const hasPrev = queueIndex > 0;

  // --- Media Session ---------------------------------------------------------
  // Surface what's playing to the OS (lock screen, notification shade, media
  // keys, Bluetooth remotes) and wire the hardware/OS controls back to the
  // player. All of this is a no-op where the API isn't supported.

  // Push a track's metadata into the OS media UI. Kept as a stable callback so
  // it can be reasserted from the <audio> loadstart handler too, not just when
  // currentTrack changes — swapping the src runs the element's load algorithm,
  // which drops the session, so without re-setting it here the notification
  // vanishes while the next track loads.
  const applyMediaMetadata = useCallback((track: PlayerTrack | null) => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }
    // Prefer the downloaded artwork blob so the lock screen has art offline.
    const artworkSrc =
      offlineArtworkRef.current?.id === track.id
        ? offlineArtworkRef.current.url
        : track.artworkSrc;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artwork: artworkSrc ? [{ src: artworkSrc, sizes: "512x512" }] : [],
    });
  }, []);

  // Reflect the current track's metadata into the OS media UI.
  useEffect(() => {
    applyMediaMetadata(currentTrack);
  }, [currentTrack, applyMediaMetadata]);

  // Resolve the current track against offline storage. If it's been downloaded,
  // swap in an OPFS blob URL for the audio and the stored artwork so playback
  // (and the lock-screen art) work with no network; otherwise the <audio> src
  // stays on the CDN URL. Blob URLs are revoked as tracks change so they can't
  // leak, and the previous track's are only dropped once the new ones are ready.
  useEffect(() => {
    const track = currentTrack;
    if (!track) {
      for (const url of offlineUrlsRef.current) URL.revokeObjectURL(url);
      offlineUrlsRef.current = [];
      offlineArtworkRef.current = null;
      setResolvedAudio(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [audio, artwork] = await Promise.all([
        getOfflineAudioUrl(track.id).catch(() => null),
        getOfflineArtworkUrl(track.id).catch(() => null),
      ]);
      if (cancelled) {
        if (audio) URL.revokeObjectURL(audio);
        if (artwork) URL.revokeObjectURL(artwork);
        return;
      }
      for (const url of offlineUrlsRef.current) URL.revokeObjectURL(url);
      const created: string[] = [];
      if (audio) created.push(audio);
      if (artwork) created.push(artwork);
      offlineUrlsRef.current = created;
      offlineArtworkRef.current = artwork ? { id: track.id, url: artwork } : null;
      setResolvedAudio(audio ? { id: track.id, src: audio } : null);
      // Reassert metadata so the offline artwork replaces the network one.
      applyMediaMetadata(track);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentTrack, applyMediaMetadata]);

  // Revoke any outstanding offline blob URLs when the provider unmounts.
  useEffect(() => {
    return () => {
      for (const url of offlineUrlsRef.current) URL.revokeObjectURL(url);
      offlineUrlsRef.current = [];
    };
  }, []);

  // Keep the OS play/pause indicator in step with our state.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = currentTrack
      ? isPlaying
        ? "playing"
        : "paused"
      : "none";
  }, [isPlaying, currentTrack]);

  // Handlers for controls that don't depend on queue position: play/pause and
  // seeking. Registered once — they read the latest state through refs.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const seekToSeconds = (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const max = Number.isFinite(audio.duration) ? audio.duration : seconds;
      const clamped = Math.min(Math.max(0, seconds), max);
      audio.currentTime = clamped;
      setCurrentTime(clamped);
    };
    ms.setActionHandler("play", () => setIsPlaying(true));
    ms.setActionHandler("pause", () => setIsPlaying(false));
    ms.setActionHandler("seekbackward", (d) =>
      seekToSeconds((audioRef.current?.currentTime ?? 0) - (d.seekOffset ?? 10)),
    );
    ms.setActionHandler("seekforward", (d) =>
      seekToSeconds((audioRef.current?.currentTime ?? 0) + (d.seekOffset ?? 10)),
    );
    ms.setActionHandler("seekto", (d) => {
      if (d.seekTime == null) return;
      const audio = audioRef.current;
      if (d.fastSeek && audio && "fastSeek" in audio) {
        audio.fastSeek(d.seekTime);
        setCurrentTime(d.seekTime);
        return;
      }
      seekToSeconds(d.seekTime);
    });
    return () => {
      for (const action of ["play", "pause", "seekbackward", "seekforward", "seekto"] as const) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          // Unsupported action — nothing to clean up.
        }
      }
    };
  }, []);

  // Previous/next handlers track queue position, so the OS greys the buttons
  // out (null handler) at the ends of the queue instead of them doing nothing.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler("previoustrack", hasPrev ? () => prev() : null);
    ms.setActionHandler("nexttrack", hasNext ? () => next() : null);
    return () => {
      try {
        ms.setActionHandler("previoustrack", null);
        ms.setActionHandler("nexttrack", null);
      } catch {
        // Unsupported action — nothing to clean up.
      }
    };
  }, [hasNext, hasPrev, next, prev]);

  // Feed the OS scrubber our position so it tracks playback and lets the user
  // scrub from the lock screen.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (typeof navigator.mediaSession.setPositionState !== "function") return;
    const duration = currentTrack?.duration;
    if (!duration || !Number.isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audioRef.current?.playbackRate ?? 1,
        position: Math.min(Math.max(0, currentTime), duration),
      });
    } catch {
      // Invalid state (e.g. position past duration mid-swap) — skip this tick.
    }
  }, [currentTrack, currentTime]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      isBuffering,
      volume,
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
      removeFromQueue,
      clearQueue,
      next,
      prev,
      discard,
    }),
    [currentTrack, isPlaying, currentTime, isBuffering, volume, queue, queueIndex, hasNext, hasPrev, play, pause, toggle, seek, setVolume, playQueue, playAt, addToQueue, playNext, reorderQueue, removeFromQueue, clearQueue, next, prev, discard],
  );

  // Play the downloaded copy when this track's offline audio has resolved;
  // otherwise stream from the CDN. Keyed by id so a stale resolution from the
  // previous track can never point the element at the wrong file.
  const audioSrc =
    resolvedAudio && currentTrack && resolvedAudio.id === currentTrack.id
      ? resolvedAudio.src
      : currentTrack?.audioSrc;

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        onLoadStart={() => applyMediaMetadata(currentTrackRef.current)}
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
