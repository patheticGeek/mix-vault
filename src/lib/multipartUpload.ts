import { sha256Hex } from "@/lib/contentHash";

// 32MB keeps large files to a few hundred requests instead of a few thousand.
// R2 requires parts to be at least 5MiB, except the last one.
const PART_SIZE = 32 * 1024 * 1024;
const MAX_PART_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;

interface UploadAudioOptions {
  onProgress?: (percent: number) => void;
}

interface UploadedPart {
  partNumber: number;
  etag: string;
}

interface PresignedPart {
  partNumber: number;
  url: string;
}

class PartUploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// R2 can return transient 5xx or drop the connection under load; retrying a
// single part is much cheaper than restarting the whole upload.
function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "error" in data && typeof (data as Record<string, unknown>).error === "string") {
      return (data as { error: string }).error;
    }
  } catch {
    // non-JSON response, fall through to fallback message
  }
  return fallback;
}

// Uploads directly to R2's S3-compatible endpoint via a presigned URL, so the
// file bytes never pass through (and burn CPU time in) our Worker.
function putPart(url: string, partNumber: number, chunk: Blob, onProgress: (loaded: number) => void): Promise<UploadedPart> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new PartUploadError("R2 did not return an ETag for this part", xhr.status));
          return;
        }
        resolve({ partNumber, etag });
        return;
      }
      reject(new PartUploadError(`Failed to upload audio file part (status ${xhr.status})`, xhr.status));
    };

    xhr.onerror = () => reject(new PartUploadError("Failed to upload audio file part", 0));
    xhr.send(chunk);
  });
}

async function putPartWithRetry(
  url: string,
  partNumber: number,
  chunk: Blob,
  onProgress: (loaded: number) => void,
): Promise<UploadedPart> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await putPart(url, partNumber, chunk, onProgress);
    } catch (err) {
      const status = err instanceof PartUploadError ? err.status : 0;
      if (attempt >= MAX_PART_RETRIES || !isRetryableStatus(status)) throw err;
      onProgress(0);
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
}

export async function uploadAudioMultipart(
  file: File,
  trackId: string,
  { onProgress }: UploadAudioOptions = {},
): Promise<string> {
  if (file.size === 0) throw new Error("Audio file is required");

  const partCount = Math.ceil(file.size / PART_SIZE);
  const contentHash = await sha256Hex(await file.arrayBuffer());

  const createRes = await fetch("/api/uploads/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trackId,
      contentHash,
      filename: file.name,
      contentType: file.type || undefined,
      partCount,
    }),
  });
  if (!createRes.ok) {
    throw new Error(await parseErrorMessage(createRes, "Failed to start audio upload"));
  }
  const { key, uploadId, parts: presignedParts } = (await createRes.json()) as {
    key: string;
    uploadId: string;
    parts: PresignedPart[];
  };

  const parts: UploadedPart[] = [];
  const loadedByPart = new Array<number>(partCount).fill(0);

  const reportProgress = () => {
    const loaded = loadedByPart.reduce((sum, n) => sum + n, 0);
    onProgress?.(Math.round((loaded / file.size) * 100));
  };

  try {
    for (const { partNumber, url } of presignedParts) {
      const i = partNumber - 1;
      const start = i * PART_SIZE;
      const chunk = file.slice(start, Math.min(start + PART_SIZE, file.size));

      const part = await putPartWithRetry(url, partNumber, chunk, (loaded) => {
        loadedByPart[i] = loaded;
        reportProgress();
      });

      loadedByPart[i] = chunk.size;
      parts.push(part);
      reportProgress();
    }
  } catch (err) {
    await fetch("/api/uploads/audio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId }),
    }).catch(() => {});
    throw err;
  }

  const completeRes = await fetch("/api/uploads/audio/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, uploadId, parts }),
  });
  if (!completeRes.ok) {
    throw new Error(await parseErrorMessage(completeRes, "Failed to finish audio upload"));
  }

  const completed = (await completeRes.json()) as { key: string };
  return completed.key;
}
