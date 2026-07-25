"use client";

import { usePlayer } from "@/components/PlayerProvider";
import { TrackListItem } from "@/components/TrackListItem";
import { APP_DESC, SOCIAL_MEDIA } from "@/config";
import { useOffline } from "@/components/offline/OfflineProvider";
import { useListTracks, type TrackSummary } from "@/hooks/queries/useListTracks";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { assetUrl } from "@/lib/cdn";
import { listDownloads, type DownloadRecord } from "@/lib/offline/idb";
import { timeAgo } from "@/lib/time";
import { WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface HomeClientProps {
  initialTracks: TrackSummary[];
}

export function HomeClient({ initialTracks }: HomeClientProps) {
  const { data: tracks, isLoading, error } = useListTracks();
  const { currentTrack } = usePlayer();
  const online = useOnlineStatus();
  // navigator.onLine only reports whether a network interface exists, not
  // whether the server is actually reachable — so also treat a failed track
  // fetch (with nothing to show) as offline. This is what makes a refresh
  // while offline land on the downloaded-only view instead of an empty list.
  const isOffline = !online || (Boolean(error) && !tracks);
  // The download index doubles as the "which tracks are available offline"
  // signal; changes to it (a new download completing) re-run the loader below.
  const { states } = useOffline();
  // Doesn't get cleared on pause like isPlaying does, so the last track
  // played stays visually marked until a different one takes over.
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);
  useEffect(() => {
    if (currentTrack) setLastPlayedId(currentTrack.id);
  }, [currentTrack]);

  // While offline we can't reach the track list, so fall back to what's saved
  // for offline playback, read straight from the download index.
  const [offlineRecords, setOfflineRecords] = useState<DownloadRecord[]>([]);
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
    if (!isOffline) return;
    let cancelled = false;
    void listDownloads()
      .then((rows) => {
        if (cancelled) return;
        rows.sort((a, b) => b.downloadedAt - a.downloadedAt);
        setOfflineRecords(rows.filter((r) => r.status === "complete"));
      })
      .catch(() => {
        if (!cancelled) setOfflineRecords([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOffline, doneKey]);

  // Object URLs for the downloaded artwork, revoked as the set changes.
  const [artUrls, setArtUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const r of offlineRecords) {
      if (r.artworkBlob) urls[r.trackId] = URL.createObjectURL(r.artworkBlob);
    }
    setArtUrls(urls);
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url);
    };
  }, [offlineRecords]);

  // The server already rendered the most recent few tracks; show those
  // immediately and let the client-side fetch (above) bring in the rest.
  const displayTracks = tracks ?? initialTracks;

  return (
    <div className="bg-base-100 text-base-content min-h-[calc(100vh-4rem)]">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <p className="py-2 max-w-xl mx-auto text-base-content/60">{APP_DESC}</p>

          {SOCIAL_MEDIA.length > 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              {SOCIAL_MEDIA.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="text-base-content/60 hover:text-base-content transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          )}
        </div>

        {isOffline ? (
          // Offline: only downloaded tracks are playable, so show just those.
          <>
            <div className="flex items-center gap-2 justify-center mb-6 text-sm text-warning">
              <WifiOff className="w-4 h-4" />
              <span>You&apos;re offline — showing downloaded tracks only.</span>
            </div>
            {offlineRecords.length === 0 ? (
              <p className="text-base-content/60 text-center">
                No downloaded tracks to play offline.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {offlineRecords.map((record) => (
                  // No slug is passed: offline there's no track page to link
                  // to, so the title/card stay non-navigational.
                  <TrackListItem
                    key={record.trackId}
                    id={record.trackId}
                    title={record.title}
                    tags={[]}
                    duration={record.duration}
                    audioSrc={record.audioSrc}
                    artworkSrc={artUrls[record.trackId] ?? record.artworkSrc}
                    timeLabel={timeAgo(new Date(record.downloadedAt))}
                    isLastPlayed={lastPlayedId === record.trackId}
                  />
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            {isLoading && displayTracks.length === 0 && (
              <div className="flex justify-center">
                <span className="loading loading-spinner loading-lg" />
              </div>
            )}

            {error && (
              <p className="text-error text-center">Failed to load tracks: {error.message}</p>
            )}

            {!isLoading && displayTracks.length === 0 && (
              <p className="text-base-content/60 text-center">No tracks yet.</p>
            )}

            {displayTracks.length > 0 && (
              <ul className="flex flex-col gap-4">
                {displayTracks.map((track) => (
                  <TrackListItem
                    key={track.id}
                    id={track.id}
                    title={track.title}
                    tags={track.tags}
                    duration={track.duration}
                    audioSrc={assetUrl(track.audioFile)}
                    artworkSrc={assetUrl(track.artworkFile)}
                    timeLabel={timeAgo(track.createdAt)}
                    slug={track.slug}
                    links={track.links}
                    isLastPlayed={lastPlayedId === track.id}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
