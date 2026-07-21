"use client";

import { usePlayer } from "@/components/PlayerProvider";
import { useEffect, type RefObject } from "react";

// Reports whether a track's own inline player (a list item or the track
// page hero) is currently on screen, so PlayerProvider knows when the
// mini player needs to stand in for it instead.
export function useTrackVisibility(id: string | undefined, ref: RefObject<Element | null>) {
  const { setVisible } = usePlayer();

  useEffect(() => {
    if (!id) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(id, entry.isIntersecting));
    observer.observe(el);

    return () => {
      observer.disconnect();
      setVisible(id, false);
    };
  }, [id, ref, setVisible]);
}
