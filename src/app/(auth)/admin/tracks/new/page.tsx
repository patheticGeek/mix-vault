"use client";

import { TrackForm } from "@/components/TrackForm";

export default function NewTrackPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-base-100 text-base-content">
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">Drop a new track</h1>
        <TrackForm />
      </main>
    </div>
  );
}
