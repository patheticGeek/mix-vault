"use client";

import { useEffect, useState } from "react";

// Whether the browser currently has network. Starts optimistic (true) so it
// matches the server render, then syncs to navigator.onLine on mount and tracks
// the online/offline events.
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}
