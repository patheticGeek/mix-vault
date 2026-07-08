"use client";

import { useEffect, useRef, useState } from "react";

interface UseAudioOptions {
  src: string;
  duration: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

interface UseAudioResult {
  audioProps: {
    ref: React.Ref<HTMLAudioElement>;
    src: string;
    preload: "metadata";
    onPlay: () => void;
    onPause: () => void;
    onEnded: () => void;
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
  };
  currentTime: number;
  seek: (fraction: number) => void;
}

// The <audio> element is the source of truth for whether it's actually
// playing — autoplay restrictions, errors, or anything else outside our
// control can pause/resume it. isPlaying only expresses what we'd *like*;
// onPlay/onPause are wired directly to the element's own events so the
// caller's state is corrected to match reality, however it changed.
export function useAudio({ src, duration, isPlaying, onPlay, onPause }: UseAudioOptions): UseAudioResult {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => onPause());
    } else {
      audio.pause();
    }
  }, [isPlaying, onPause]);

  function seek(fraction: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const time = fraction * duration;
    audio.currentTime = time;
    setCurrentTime(time);
  }

  return {
    audioProps: {
      ref: audioRef,
      src,
      preload: "metadata",
      onPlay,
      onPause,
      onEnded: onPause,
      onTimeUpdate: (e) => setCurrentTime(e.currentTarget.currentTime),
    },
    currentTime,
    seek,
  };
}
