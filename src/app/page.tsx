"use client";

import { TrackListItem } from "@/components/TrackListItem";
import { useListTracks } from "@/hooks/queries/useListTracks";
import { useState } from "react";

export default function Home() {
  const { data: tracks, isLoading, error } = useListTracks();
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="bg-base-100 text-base-content min-h-[calc(100vh-4rem)]">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold">Mix Vault</h1>
          <p className="py-2 max-w-xl mx-auto text-base-content/60">
            A minimal creative vault inspired by modern audio platforms: calm,
            dark, and focused.
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}

        {error && (
          <p className="text-error text-center">Failed to load tracks: {error.message}</p>
        )}

        {tracks && tracks.length === 0 && (
          <p className="text-base-content/60 text-center">No tracks yet.</p>
        )}

        {tracks && tracks.length > 0 && (
          <ul className="flex flex-col gap-4">
            {tracks.map((track) => (
              <TrackListItem
                key={track.id}
                track={track}
                isPlaying={playingId === track.id}
                onPlay={() => setPlayingId(track.id)}
                onPause={() => setPlayingId((current) => (current === track.id ? null : current))}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
