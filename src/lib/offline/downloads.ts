// Orchestrates a track download: stream the audio to OPFS, stash the artwork +
// metadata in IndexedDB, and later resolve either back into blob URLs the
// player can feed to the <audio> element. Everything here is browser-only and
// meant to be called from client components / effects.

import {
  deleteDownload,
  getDownload,
  isIdbSupported,
  listDownloadedIds,
  putDownload,
  type DownloadRecord,
} from "@/lib/offline/idb";
import {
  deleteAudio,
  getAudioFile,
  isOpfsSupported,
  writeAudio,
} from "@/lib/offline/opfs";

// The subset of a track needed to download it — matches PlayerTrack, so a
// PlayerTrack can be passed straight through.
export interface DownloadableTrack {
  id: string;
  title: string;
  slug?: string;
  duration: number;
  audioSrc: string;
  artworkSrc: string;
}

export function isOfflineSupported(): boolean {
  return isOpfsSupported() && isIdbSupported();
}

// Fetch the audio and stream it to disk, then the artwork + metadata. Progress
// is reported as a 0..1 fraction when the response advertises a length, and
// stays at 0 (indeterminate) when it doesn't.
export async function downloadTrack(
  track: DownloadableTrack,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  if (!isOfflineSupported()) {
    throw new Error("Offline downloads aren't supported in this browser.");
  }

  const res = await fetch(track.audioSrc);
  if (!res.ok || !res.body) {
    throw new Error(`Couldn't fetch audio (${res.status}).`);
  }
  const mimeType = res.headers.get("content-type") || "audio/mpeg";
  const total = Number(res.headers.get("content-length")) || 0;

  let bytes: number;
  try {
    bytes = await writeAudio(track.id, res.body, (written) => {
      if (total > 0) onProgress?.(Math.min(1, written / total));
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new Error("Not enough storage space to download this track.");
    }
    throw err;
  }

  // Artwork is small and optional — a failure here shouldn't fail the download,
  // the track just won't have offline artwork.
  let artworkBlob: Blob | null = null;
  try {
    const artRes = await fetch(track.artworkSrc);
    if (artRes.ok) artworkBlob = await artRes.blob();
  } catch {
    // leave artworkBlob null
  }

  const record: DownloadRecord = {
    trackId: track.id,
    audioSrc: track.audioSrc,
    artworkSrc: track.artworkSrc,
    mimeType,
    bytes,
    title: track.title,
    slug: track.slug,
    duration: track.duration,
    artworkBlob,
    downloadedAt: Date.now(),
  };
  try {
    await putDownload(record);
  } catch (err) {
    // Metadata write failed — don't strand orphaned bytes in OPFS.
    await deleteAudio(track.id);
    throw err;
  }
}

export async function removeDownload(trackId: string): Promise<void> {
  await deleteAudio(trackId);
  await deleteDownload(trackId);
}

export function listDownloaded(): Promise<string[]> {
  return listDownloadedIds();
}

// A blob URL for the downloaded audio, or null if it isn't downloaded. The
// mime type is re-applied via File.slice (a zero-copy view) so the <audio>
// element knows how to decode it. Callers own the URL and must revoke it.
export async function getOfflineAudioUrl(trackId: string): Promise<string | null> {
  const record = await getDownload(trackId).catch(() => undefined);
  if (!record) return null;
  const file = await getAudioFile(trackId);
  if (!file) return null;
  const typed = file.slice(0, file.size, record.mimeType);
  return URL.createObjectURL(typed);
}

// A blob URL for the downloaded artwork, or null. Callers own the URL.
export async function getOfflineArtworkUrl(trackId: string): Promise<string | null> {
  const record = await getDownload(trackId).catch(() => undefined);
  if (!record?.artworkBlob) return null;
  return URL.createObjectURL(record.artworkBlob);
}

export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
