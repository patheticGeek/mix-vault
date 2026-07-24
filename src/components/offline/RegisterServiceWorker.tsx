"use client";

import { useEffect } from "react";

// Registers the app-shell service worker (public/sw.js) once, on the client.
// Rendered high in the tree (Providers) so it runs on every page. It's the
// piece that makes the app openable with no network — without a cached shell,
// downloaded tracks in OPFS would be unreachable because nothing could boot to
// read them.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // Registering during dev churns the cache against Next's HMR and hides
    // fresh code behind the shell cache, so keep it to production builds.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration is best-effort: failure just means no offline shell.
      });
    };
    // Wait for load so the SW install doesn't contend with the initial page.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
