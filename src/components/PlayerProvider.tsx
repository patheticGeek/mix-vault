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
  // Whether the current track's own inline player (a list item or the track
  // page hero) is on screen somewhere right now — see useTrackVisibility.
  // The mini player only shows itself when this is false.
  isCurrentVisible: boolean;
  play: (track: PlayerTrack) => void;
  pause: () => void;
  toggle: (track: PlayerTrack) => void;
  seek: (fraction: number) => void;
  setVisible: (id: string, visible: boolean) => void;
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

  // Mirror the latest track/playing state into refs so the callbacks below
  // can stay referentially stable (no deps on state) instead of changing
  // identity on every play/pause/time tick.
  const currentTrackRef = useRef<PlayerTrack | null>(null);
  const isPlayingRef = useRef(false);
  const visibleIds = useRef<Set<string>>(new Set());

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

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      isBuffering,
      isCurrentVisible,
      play,
      pause,
      toggle,
      seek,
      setVisible,
    }),
    [currentTrack, isPlaying, currentTime, isBuffering, isCurrentVisible, play, pause, toggle, seek, setVisible],
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
          setIsPlaying(false);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
      />
    </PlayerContext.Provider>
  );
}
