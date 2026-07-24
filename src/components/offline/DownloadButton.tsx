"use client";

import { useDownload } from "@/components/offline/OfflineProvider";
import type { DownloadableTrack } from "@/lib/offline/downloads";
import { Check, Download, Loader2, TriangleAlert } from "lucide-react";

// Per-track offline control. Cycles through download → progress → downloaded
// (tap again to remove). Hidden entirely where the browser can't back offline
// storage, so it never offers something that won't work.
export function DownloadButton({ track }: { track: DownloadableTrack }) {
  const { supported, state, download, remove } = useDownload(track.id);
  if (!supported) return null;

  const status = state?.status;

  if (status === "downloading") {
    const pct = Math.round((state?.progress ?? 0) * 100);
    return (
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        aria-label={`Downloading ${pct}%`}
        title={pct > 0 ? `Downloading ${pct}%` : "Downloading…"}
        disabled
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        {pct > 0 && <span className="text-[10px] tabular-nums">{pct}%</span>}
      </button>
    );
  }

  if (status === "done") {
    return (
      <button
        type="button"
        onClick={() => remove(track.id)}
        className="btn btn-ghost btn-xs text-success"
        aria-label="Downloaded — tap to remove"
        title="Downloaded for offline — tap to remove"
      >
        <Check className="w-4 h-4" />
      </button>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={() => download(track)}
        className="btn btn-ghost btn-xs text-error"
        aria-label="Download failed — tap to retry"
        title={state?.error ? `${state.error} Tap to retry.` : "Download failed — tap to retry"}
      >
        <TriangleAlert className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => download(track)}
      className="btn btn-ghost btn-xs"
      aria-label="Download for offline"
      title="Download for offline"
    >
      <Download className="w-4 h-4" />
    </button>
  );
}
