"use client";

import { TrackListItem } from "@/components/TrackListItem";
import { APP_DESC, APP_TITLE, SOCIAL_MEDIA } from "@/config";
import { useListTracks } from "@/hooks/queries/useListTracks";
import { assetUrl } from "@/lib/cdn";
import { timeAgo } from "@/lib/time";
import { parsePeaks } from "@/lib/waveform";
import { useState } from "react";

export default function Home() {
  const { data: tracks, isLoading, error } = useListTracks();
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="bg-base-100 text-base-content min-h-[calc(100vh-4rem)]">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold">{APP_TITLE}</h1>
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
                title={track.title}
                description={track.description}
                tags={track.tags}
                peaks={parsePeaks(track.waveformPreview)}
                duration={track.duration}
                audioSrc={assetUrl(track.audioFile)}
                artworkSrc={assetUrl(track.artworkFile)}
                timeLabel={timeAgo(track.createdAt)}
                slug={track.slug}
                links={track.links}
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
