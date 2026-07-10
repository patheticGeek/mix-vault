"use client";

import { CopyLinkButton } from "@/components/CopyLinkButton";
import { useListTracks } from "@/hooks/queries/useListTracks";
import Link from "next/link";

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function AdminPage() {
  const { data: tracks, isLoading, error } = useListTracks();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-base-100 text-base-content">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Tracks</h1>
          <Link href="/admin/tracks/new" className="btn btn-primary">
            Drop a new track
          </Link>
        </div>

        {isLoading && <span className="loading loading-spinner loading-lg" />}

        {error && (
          <p className="text-error">Failed to load tracks: {error.message}</p>
        )}

        {tracks && tracks.length === 0 && (
          <p className="text-base-content/60">No tracks yet.</p>
        )}

        {tracks && tracks.length > 0 && (
          <ul className="list bg-base-200 rounded-box w-full">
            {tracks.map((track) => (
              <li
                key={track.id}
                className="list-row hover:bg-base-300 transition-colors flex items-center gap-2"
              >
                <Link href={`/admin/tracks/${track.id}/edit`} className="flex-1 min-w-0">
                  <div className="font-semibold">{track.title}</div>
                  <div className="text-sm text-base-content/60">/{track.slug}</div>
                </Link>
                <CopyLinkButton slug={track.slug} />
                <ChevronRightIcon />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
