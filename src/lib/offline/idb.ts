// The index of what's been downloaded for offline playback. Audio bytes live
// in OPFS (see opfs.ts); this store holds the small, queryable metadata plus
// the artwork blob (artwork is tiny, so IndexedDB is a fine home for it and
// keeps "list my downloads" a single store read).

const DB_NAME = "mix-vault-offline";
const DB_VERSION = 1;
const STORE = "downloads";

export interface DownloadRecord {
  // Primary key; also the OPFS filename for the audio.
  trackId: string;
  // The CDN audio URL at download time. If a track is re-uploaded its URL
  // (content hash) changes, so a mismatch flags the download as stale.
  audioSrc: string;
  artworkSrc: string;
  mimeType: string;
  bytes: number;
  title: string;
  slug?: string;
  duration: number;
  artworkBlob: Blob | null;
  downloadedAt: number;
}

export function isIdbSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "trackId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const req = run(transaction.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function getDownload(trackId: string): Promise<DownloadRecord | undefined> {
  return tx<DownloadRecord | undefined>("readonly", (s) => s.get(trackId));
}

export function putDownload(record: DownloadRecord): Promise<IDBValidKey> {
  return tx("readwrite", (s) => s.put(record));
}

export function deleteDownload(trackId: string): Promise<undefined> {
  return tx("readwrite", (s) => s.delete(trackId));
}

export function listDownloads(): Promise<DownloadRecord[]> {
  return tx<DownloadRecord[]>("readonly", (s) => s.getAll());
}

export function listDownloadedIds(): Promise<string[]> {
  return tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys()).then((keys) =>
    keys.map(String),
  );
}
