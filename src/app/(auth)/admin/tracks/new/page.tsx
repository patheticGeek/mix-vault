"use client";

import { TrackForm } from "@/components/TrackForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTrackPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-base-100 text-base-content">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/admin" className="btn btn-ghost btn-sm gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-3xl font-bold mb-8">Drop a new track</h1>
        <TrackForm />
      </main>
    </div>
  );
}
