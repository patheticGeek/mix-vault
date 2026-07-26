"use client";

import {
  downloadTrack,
  isOfflineSupported,
  listDownloadStates,
  removeDownload,
  type DownloadableTrack,
} from "@/lib/offline/downloads";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type DownloadStatus = "downloading" | "done" | "error" | "partial";

export interface DownloadState {
  status: DownloadStatus;
  // 0..1 while downloading (0 = just started / indeterminate).
  progress: number;
  error?: string;
}

interface OfflineContextValue {
  supported: boolean;
  // Per-track download state. A missing entry means "not downloaded".
  states: Record<string, DownloadState>;
  download: (track: DownloadableTrack) => void;
  remove: (trackId: string) => void;
  removeAll: () => void;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within an OfflineProvider");
  return ctx;
}

// Convenience hook for a single track's controls.
export function useDownload(trackId: string | undefined) {
  const { supported, states, download, remove } = useOffline();
  return {
    supported,
    state: trackId ? states[trackId] : undefined,
    download,
    remove,
  };
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [supported, setSupported] = useState(false);
  const [states, setStates] = useState<Record<string, DownloadState>>({});

  const setState = useCallback((id: string, state: DownloadState | null) => {
    setStates((prev) => {
      if (!state) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: state };
    });
  }, []);

  // Hydrate from what's already on disk so downloaded tracks show as such on
  // first paint, and only expose the feature where the browser can back it.
  useEffect(() => {
    const ok = isOfflineSupported();
    setSupported(ok);
    if (!ok) return;
    let cancelled = false;
    void listDownloadStates()
      .then((entries) => {
        if (cancelled) return;
        setStates((prev) => {
          const next = { ...prev };
          for (const { id, status } of entries) {
            next[id] =
              status === "partial"
                ? { status: "partial", progress: 0 }
                : { status: "done", progress: 1 };
          }
          return next;
        });
      })
      .catch(() => {
        // Couldn't read the index — leave everything as not-downloaded.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Downloads run one at a time, chained off this promise. Large files streamed
  // concurrently would hammer the network and disk for no real benefit.
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  const download = useCallback(
    (track: DownloadableTrack) => {
      setState(track.id, { status: "downloading", progress: 0 });
      chainRef.current = chainRef.current.then(async () => {
        try {
          await downloadTrack(track, (fraction) =>
            setState(track.id, { status: "downloading", progress: fraction }),
          );
          setState(track.id, { status: "done", progress: 1 });
        } catch (err) {
          setState(track.id, {
            status: "error",
            progress: 0,
            error: err instanceof Error ? err.message : "Download failed.",
          });
        }
      });
    },
    [setState],
  );

  const remove = useCallback(
    (trackId: string) => {
      // Drop it from the UI immediately; the disk cleanup runs behind it.
      setState(trackId, null);
      void removeDownload(trackId).catch(() => {
        // Best-effort — a failed delete just leaves bytes we'll overwrite later.
      });
    },
    [setState],
  );

  const removeAll = useCallback(() => {
    setStates((prev) => {
      for (const id of Object.keys(prev)) {
        void removeDownload(id).catch(() => {
          // Best-effort per track.
        });
      }
      return {};
    });
  }, []);

  const value = useMemo<OfflineContextValue>(
    () => ({ supported, states, download, remove, removeAll }),
    [supported, states, download, remove, removeAll],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}
