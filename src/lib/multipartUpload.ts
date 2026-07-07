const PART_SIZE = 8 * 1024 * 1024; // R2 requires parts to be at least 5MiB, except the last one

interface UploadAudioOptions {
  onProgress?: (percent: number) => void;
}

interface UploadedPart {
  partNumber: number;
  etag: string;
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

function putPart(
  key: string,
  uploadId: string,
  partNumber: number,
  chunk: Blob,
  onProgress: (loaded: number) => void,
): Promise<UploadedPart> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const params = new URLSearchParams({ key, uploadId, partNumber: String(partNumber) });
    xhr.open("PUT", `/api/uploads/audio/part?${params.toString()}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };

    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // handled by the status check below
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as UploadedPart);
        return;
      }

      const hasErrorMessage =
        data && typeof data === "object" && "error" in data && typeof (data as Record<string, unknown>).error === "string";
      reject(new Error(hasErrorMessage ? (data as { error: string }).error : "Failed to upload audio file part"));
    };

    xhr.onerror = () => reject(new Error("Failed to upload audio file part"));
    xhr.send(chunk);
  });
}

export async function uploadAudioMultipart(file: File, { onProgress }: UploadAudioOptions = {}): Promise<string> {
  if (file.size === 0) throw new Error("Audio file is required");

  const createRes = await fetch("/api/uploads/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type || undefined }),
  });
  if (!createRes.ok) {
    throw new Error(await parseErrorMessage(createRes, "Failed to start audio upload"));
  }
  const { key, uploadId } = (await createRes.json()) as { key: string; uploadId: string };

  const partCount = Math.ceil(file.size / PART_SIZE);
  const parts: UploadedPart[] = [];
  const loadedByPart = new Array<number>(partCount).fill(0);

  const reportProgress = () => {
    const loaded = loadedByPart.reduce((sum, n) => sum + n, 0);
    onProgress?.(Math.round((loaded / file.size) * 100));
  };

  try {
    for (let i = 0; i < partCount; i++) {
      const partNumber = i + 1;
      const start = i * PART_SIZE;
      const chunk = file.slice(start, Math.min(start + PART_SIZE, file.size));

      const part = await putPart(key, uploadId, partNumber, chunk, (loaded) => {
        loadedByPart[i] = loaded;
        reportProgress();
      });

      loadedByPart[i] = chunk.size;
      parts.push({ partNumber: part.partNumber, etag: part.etag });
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
