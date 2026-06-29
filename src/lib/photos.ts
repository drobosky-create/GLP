/**
 * photos.ts — progress-photo storage adapter (PRD §3 item 11, premium fast-follow).
 * App-layer (NOT part of the verified core): photos are binary blobs that don't
 * belong in the core's single JSON AppData snapshot, so they live in their own
 * IndexedDB database here. The only module that touches photo storage.
 *
 * Capture is done with a file input in the UI (works on web and opens the camera in
 * the native webview), so no camera plugin dependency is required; @capacitor/camera
 * can replace it later for a nicer native capture UX.
 *
 * Neutrality: stores the user's own photos on-device; nothing is shared out.
 */

const DB_NAME = "tally-photos";
const STORE = "photos";
const VERSION = 1;

export interface PhotoRecord {
  id: string;
  at: number; // epoch ms
  note?: string;
  type: string; // MIME
  blob: Blob;
}

/** Lightweight metadata for sorting/comparison without holding the blob. */
export interface PhotoMeta {
  id: string;
  at: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function addPhoto(input: {
  at: number;
  blob: Blob;
  note?: string;
}): Promise<PhotoRecord> {
  const rec: PhotoRecord = {
    id: crypto.randomUUID(),
    at: input.at,
    note: input.note,
    type: input.blob.type || "image/jpeg",
    blob: input.blob,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return rec;
}

export async function allPhotos(): Promise<PhotoRecord[]> {
  const db = await openDb();
  return new Promise<PhotoRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PhotoRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removePhoto(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Pure: pick the earliest and latest photo for a side-by-side comparison.
 * Returns null if there are fewer than two. Unit-tested in tests/photos.test.ts.
 */
export function pickComparison<T extends PhotoMeta>(
  photos: T[],
): { first: T; latest: T } | null {
  if (photos.length < 2) return null;
  const sorted = [...photos].sort((a, b) => a.at - b.at);
  return { first: sorted[0], latest: sorted[sorted.length - 1] };
}
