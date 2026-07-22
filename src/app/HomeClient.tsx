"use client";

import { usePlayer } from "@/components/PlayerProvider";
import { TrackListItem } from "@/components/TrackListItem";
import { APP_DESC, SOCIAL_MEDIA } from "@/config";
import { useListTracks, type TrackSummary } from "@/hooks/queries/useListTracks";
import { assetUrl } from "@/lib/cdn";
import { timeAgo } from "@/lib/time";
import { useEffect, useState } from "react";

interface HomeClientProps {
  initialTracks: TrackSummary[];
}

export function HomeClient({ initialTracks }: HomeClientProps) {
  const { data: tracks, isLoading, error } = useListTracks();
  const { currentTrack } = usePlayer();
  // Doesn't get cleared on pause like isPlaying does, so the last track
  // played stays visually marked until a different one takes over.
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);
  useEffect(() => {
    if (currentTrack) setLastPlayedId(currentTrack.id);
  }, [currentTrack]);

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
      </main>
    </div>
  );
}
