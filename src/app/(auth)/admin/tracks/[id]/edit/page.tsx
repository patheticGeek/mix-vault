"use client";

import { TrackForm } from "@/components/TrackForm";
import { useTrack } from "@/hooks/queries/useTrack";
import { useParams } from "next/navigation";

export default function EditTrackPage() {
  const { id } = useParams<{ id: string }>();
  const { data: track, isLoading, error } = useTrack(id);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-base-100 text-base-content">
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">Edit track</h1>

        {isLoading && <span className="loading loading-spinner loading-lg" />}

        {error && (
          <p className="text-error">Failed to load track: {error.message}</p>
        )}

        {track && <TrackForm track={track} />}
      </main>
    </div>
  );
}
