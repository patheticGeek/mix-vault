// Audio bytes live in the Origin Private File System (OPFS), not IndexedDB.
// Tracks are large (a real WAV here is ~260 MB), and OPFS is the only browser
// store that lets us *stream* a download straight to disk without ever holding
// the whole file in memory, and hand back a File that the <audio> element can
// stream ranges from (via a blob URL) without loading it all either.
//
// Everything is keyed by a single filename per track (the track id); the mime
// type and other metadata are tracked alongside in IndexedDB (see idb.ts).

const AUDIO_DIR = "audio";

export function isOpfsSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function"
  );
}

async function audioDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(AUDIO_DIR, { create: true });
}

// Stream a response body to a file on disk, reporting bytes written as it goes.
// On any failure (including the caller aborting) the partial file is removed so
// we never leave a half-written track that would play as truncated audio.
// Returns the total number of bytes written.
export async function writeAudio(
  fileName: string,
  body: ReadableStream<Uint8Array>,
  onProgress?: (bytesWritten: number) => void,
): Promise<number> {
  const dir = await audioDir();
  const handle = await dir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  let written = 0;
  try {
    const reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // The chunk is a Uint8Array (a BufferSource); the extra cast placates
      // the writer's stricter ArrayBuffer-vs-ArrayBufferLike generic.
      await writable.write(value as BufferSource);
      written += value.byteLength;
      onProgress?.(written);
    }
    await writable.close();
    return written;
  } catch (err) {
    // Roll back the partial write. abort() may already have been called by the
    // stream machinery, so both cleanups are best-effort.
    try {
      await writable.abort();
    } catch {
      // already aborted/closed
    }
    try {
      await dir.removeEntry(fileName);
    } catch {
      // nothing to remove
    }
    throw err;
  }
}

// The stored File, or null if this track isn't downloaded. The File is a
// disk-backed handle — reading it doesn't pull the bytes into memory.
export async function getAudioFile(fileName: string): Promise<File | null> {
  try {
    const dir = await audioDir();
    const handle = await dir.getFileHandle(fileName);
    return await handle.getFile();
  } catch {
    return null;
  }
}

export async function deleteAudio(fileName: string): Promise<void> {
  try {
    const dir = await audioDir();
    await dir.removeEntry(fileName);
  } catch {
    // Not there — treat as already deleted.
  }
}

export async function hasAudio(fileName: string): Promise<boolean> {
  try {
    const dir = await audioDir();
    await dir.getFileHandle(fileName);
    return true;
  } catch {
    return false;
  }
}
