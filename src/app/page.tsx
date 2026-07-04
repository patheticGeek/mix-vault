"use client";

import { useListTracks } from "@/hooks/queries/useListTracks";
import { AuthStatus } from "@/components/AuthStatus";

export default function Home() {
  const { data: tracks, isLoading, error } = useListTracks();

  return (
    <div className="bg-base-100 text-base-content">
      <header className="navbar">
        <div className="navbar-start">
          <a className="btn btn-ghost normal-case">Mix Vault</a>
        </div>
        <div className="navbar-end">
          <AuthStatus />
        </div>
      </header>

      <main className="hero min-h-[calc(100vh-4rem)]">
        <div className="hero-content flex-col text-center gap-8">
          <div>
            <h1 className="text-5xl font-bold">Mix Vault</h1>
            <p className="py-4 max-w-xl mx-auto">
              A minimal creative vault inspired by modern audio platforms: calm,
              dark, and focused.
            </p>
          </div>

          {isLoading && <span className="loading loading-spinner loading-lg" />}

          {error && (
            <p className="text-error">Failed to load tracks: {error.message}</p>
          )}

          {tracks && tracks.length === 0 && (
            <p className="text-base-content/60">No tracks yet.</p>
          )}

          {tracks && tracks.length > 0 && (
            <ul className="list bg-base-200 rounded-box w-full max-w-md">
              {tracks.map((track) => (
                <li key={track.id} className="list-row">
                  {track.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
