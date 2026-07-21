"use client";

import { CopyLinkButton } from "@/components/CopyLinkButton";
import { Waveform } from "@/components/Waveform";
import { TRACK_LINK_ICONS, TRACK_LINK_LABELS } from "@/config";
import { useTrackBySlug } from "@/hooks/queries/useTrackBySlug";
import { useAudio } from "@/hooks/useAudio";
import { assetUrl } from "@/lib/cdn";
import { formatDuration, timeAgo } from "@/lib/time";
import { TRACK_LINK_KEYS } from "@/lib/trackLinks";
import { parsePeaks } from "@/lib/waveform";
import { ArrowLeft, Loader2, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function TrackPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: track, isLoading, error } = useTrackBySlug(slug);
  const [isPlaying, setIsPlaying] = useState(false);

  const { audioProps, currentTime, isBuffering, seek } = useAudio({
    src: track ? assetUrl(track.audioFile) : "",
    duration: track?.duration ?? 0,
    isPlaying,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
  });

  return (
    <div className="bg-base-100 text-base-content min-h-[calc(100vh-4rem)]">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="btn btn-ghost btn-sm gap-1 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to all tracks
        </Link>

        {isLoading && (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}

        {error && <p className="text-error text-center">Failed to load track: {error.message}</p>}

        {track === null && (
          <div className="text-center py-10">
            <p className="text-lg font-semibold">Track not found</p>
            <p className="text-base-content/60 mt-1">It may have been removed or the link is wrong.</p>
            <Link href="/" className="btn btn-primary btn-sm mt-6">
              Back to all tracks
            </Link>
          </div>
        )}

        {track && (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-box overflow-hidden bg-base-300 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(track.artworkFile)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setIsPlaying((current) => !current)}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
              >
                <span className="flex items-center justify-center w-16 h-16 rounded-full bg-base-100/90 text-base-content">
                  {isPlaying ? (
                    isBuffering ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <Pause className="w-8 h-8" fill="currentColor" />
                    )
                  ) : (
                    <Play className="w-8 h-8 translate-x-0.5" fill="currentColor" />
                  )}
                </span>
              </button>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{track.title}</h1>
              <p className="text-sm text-base-content/60 mt-1">
                {track.recordedAt &&
                  `Recorded ${new Date(track.recordedAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })} · `}
                Uploaded {timeAgo(track.createdAt)}
              </p>
            </div>

            {track.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
                {track.tags.map((tag) => (
                  <span key={tag} className="text-sm text-base-content/50">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              {TRACK_LINK_KEYS.filter((key) => track.links[key]).map((key) => {
                const Icon = TRACK_LINK_ICONS[key];
                return (
                  <a
                    key={key}
                    href={track.links[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={TRACK_LINK_LABELS[key]}
                    title={TRACK_LINK_LABELS[key]}
                    className="btn btn-ghost btn-sm"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
              <CopyLinkButton slug={track.slug} showLabel />
            </div>

            <div className="relative w-full mt-4">
              <Waveform
                peaks={parsePeaks(track.waveformPreview)}
                progress={track.duration ? currentTime / track.duration : 0}
                onSeek={seek}
              />
              <span className="absolute bottom-0.5 left-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
                {formatDuration(currentTime)}
              </span>
              <span className="absolute bottom-0.5 right-1 text-[10px] tabular-nums text-base-content/70 bg-black/60 px-1 rounded">
                {formatDuration(track.duration)}
              </span>
            </div>

            {track.description && (
              <p className="text-left w-full text-base-content/80 whitespace-pre-wrap mt-2">
                {track.description}
              </p>
            )}

            <audio {...audioProps} />
          </div>
        )}
      </main>
    </div>
  );
}
