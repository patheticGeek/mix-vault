"use client";

import { useDownload } from "@/components/offline/OfflineProvider";
import type { DownloadableTrack } from "@/lib/offline/downloads";
import { Check, Download, Loader2, RotateCcw, TriangleAlert } from "lucide-react";

// Per-track offline control. Cycles through download → progress → downloaded
// (tap again to remove), with distinct states for a failed attempt (retry) and
// a download left partial by a crash/close (finish). Hidden entirely where the
// browser can't back offline storage, so it never offers something that won't
// work. Pass `showLabel` for the roomier, text + icon variant used on the
// track page.
export function DownloadButton({
  track,
  showLabel = false,
}: {
  track: DownloadableTrack;
  showLabel?: boolean;
}) {
  const { supported, state, download, remove } = useDownload(track.id);
  if (!supported) return null;

  const status = state?.status;
  const base = showLabel ? "btn btn-ghost btn-sm gap-1.5" : "btn btn-ghost btn-xs";
  const label = (text: string) => showLabel && <span>{text}</span>;

  if (status === "downloading") {
    const pct = Math.round((state?.progress ?? 0) * 100);
    const text = pct > 0 ? `Downloading ${pct}%` : "Downloading…";
    return (
      <button type="button" className={base} aria-label={text} title={text} disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
        {showLabel ? <span>{text}</span> : pct > 0 && <span className="text-[10px] tabular-nums">{pct}%</span>}
      </button>
    );
  }

  if (status === "partial") {
    return (
      <button
        type="button"
        onClick={() => download(track)}
        className={`${base} text-warning`}
        aria-label="Only partially downloaded — tap to finish"
        title="Only partially downloaded — tap to finish downloading"
      >
        <TriangleAlert className="w-4 h-4" />
        {label("Finish download")}
      </button>
    );
  }

  if (status === "done") {
    return (
      <button
        type="button"
        onClick={() => remove(track.id)}
        className={`${base} text-success`}
        aria-label="Downloaded — tap to remove"
        title="Downloaded for offline — tap to remove"
      >
        <Check className="w-4 h-4" />
        {label("Downloaded")}
      </button>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={() => download(track)}
        className={`${base} text-error`}
        aria-label="Download failed — tap to retry"
        title={state?.error ? `${state.error} Tap to retry.` : "Download failed — tap to retry"}
      >
        <RotateCcw className="w-4 h-4" />
        {label("Retry download")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => download(track)}
      className={base}
      aria-label="Download for offline"
      title="Download for offline"
    >
      <Download className="w-4 h-4" />
      {label("Download for offline")}
    </button>
  );
}
