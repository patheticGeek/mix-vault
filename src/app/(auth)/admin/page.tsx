"use client";

import { useListTracks } from "@/hooks/queries/useListTracks";
import Link from "next/link";

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
              <li key={track.id}>
                <Link
                  href={`/admin/tracks/${track.id}/edit`}
                  className="list-row hover:bg-base-300 transition-colors"
                >
                  <div>
                    <div className="font-semibold">{track.title}</div>
                    <div className="text-sm text-base-content/60">/{track.slug}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
