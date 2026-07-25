"use client";

import { useOffline } from "@/components/offline/OfflineProvider";
import { usePlayer, type PlayerTrack } from "@/components/PlayerProvider";
import { estimateUsage } from "@/lib/offline/downloads";
import { listDownloads, type DownloadRecord } from "@/lib/offline/idb";
import { formatDuration } from "@/lib/time";
import { Download, HardDrive, Pause, Play, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 MB";
  const mb = bytes / 1e6;
  if (mb >= 1000) return `${(mb / 1000).toFixed(2)} GB`;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

function recordToTrack(record: DownloadRecord): PlayerTrack {
  return {
    id: record.trackId,
    slug: record.slug,
    title: record.title,
    audioSrc: record.audioSrc,
    artworkSrc: record.artworkSrc,
    duration: record.duration,
  };
}

// Manages what's saved for offline: lists downloaded tracks, shows how much
// space they take, and lets the listener play or remove them. Everything here
// reads from local storage (OPFS/IndexedDB), so it works with no network.
export function DownloadsClient() {
  const { supported, states, remove, removeAll } = useOffline();
  const { currentTrack, isPlaying, toggle, playQueue } = usePlayer();

  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // The set of finished downloads, as a stable key so the loader re-runs when a
  // download completes or a track is removed (both change `states`).
  const doneKey = useMemo(
    () =>
      Object.entries(states)
        .filter(([, s]) => s.status === "done")
        .map(([id]) => id)
        .sort()
        .join(","),
    [states],
  );

  useEffect(() => {
    if (!supported) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [rows, est] = await Promise.all([
        listDownloads().catch(() => [] as DownloadRecord[]),
        estimateUsage().catch(() => null),
      ]);
      if (cancelled) return;
      rows.sort((a, b) => b.downloadedAt - a.downloadedAt);
      setRecords(rows);
      setUsage(est);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, doneKey]);

  // Artwork blobs turned into object URLs for the thumbnails, revoked on change.
  const [artUrls, setArtUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const r of records) {
      if (r.artworkBlob) urls[r.trackId] = URL.createObjectURL(r.artworkBlob);
    }
    setArtUrls(urls);
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url);
    };
  }, [records]);

  // The provider's `states` is the source of truth for what's still downloaded;
  // IDB records only supply the metadata. Filtering by it makes removal instant
  // and immune to the IDB delete racing behind the (fire-and-forget) cleanup.
  const visibleRecords = useMemo(
    () => records.filter((r) => states[r.trackId]?.status === "done"),
    [records, states],
  );

  const totalBytes = useMemo(
    () => visibleRecords.reduce((sum, r) => sum + (r.bytes || 0), 0),
    [visibleRecords],
  );

  const playRecord = (index: number) => {
    playQueue(visibleRecords.map(recordToTrack), index);
  };

  if (!supported) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Downloads</h1>
        <p className="text-base-content/60">
          Offline downloads aren&apos;t supported in this browser.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Downloads</h1>
        {visibleRecords.length > 0 && (
          <button
            type="button"
            onClick={removeAll}
            className="btn btn-ghost btn-sm text-error gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Remove all
          </button>
        )}
      </div>

      {/* Storage summary */}
      <div className="rounded-box bg-base-200 p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-base-content/70">
          <HardDrive className="w-4 h-4" />
          <span>
            {visibleRecords.length} {visibleRecords.length === 1 ? "track" : "tracks"} ·{" "}
            {formatBytes(totalBytes)} downloaded
          </span>
        </div>
        {usage && usage.quota > 0 && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-base-300 overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, (usage.usage / usage.quota) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-base-content/50">
              {formatBytes(usage.usage)} of {formatBytes(usage.quota)} device storage used
            </p>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-base-content/50">Loading…</p>
      ) : visibleRecords.length === 0 ? (
        <div className="text-center py-16 text-base-content/60">
          <Download className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No downloads yet</p>
          <p className="text-sm mt-1">
            Tap the download icon on a track to save it here for offline listening.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleRecords.map((record, index) => {
            const isCurrent = currentTrack?.id === record.trackId;
            const showPause = isCurrent && isPlaying;
            const art = artUrls[record.trackId];
            return (
              <li
                key={record.trackId}
                className={`flex items-center gap-3 p-3 rounded-box bg-base-200 ${
                  isCurrent ? "ring-1 ring-zinc-600" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    isCurrent ? toggle(recordToTrack(record)) : playRecord(index)
                  }
                  aria-label={showPause ? "Pause" : "Play"}
                  className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-base-300 flex items-center justify-center group"
                >
                  {art && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={art} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-base-100/90 text-base-content">
                    {showPause ? (
                      <Pause className="w-4 h-4" fill="currentColor" />
                    ) : (
                      <Play className="w-4 h-4 translate-x-0.5" fill="currentColor" />
                    )}
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{record.title}</p>
                  <p className="text-xs text-base-content/50">
                    {formatDuration(record.duration)} · {formatBytes(record.bytes)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => remove(record.trackId)}
                  aria-label="Remove download"
                  title="Remove download"
                  className="btn btn-ghost btn-sm btn-square text-base-content/60 hover:text-error"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
