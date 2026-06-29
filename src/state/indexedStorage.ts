import type { AppData } from "../types";
import { emptyData, type Storage } from "../lib/db";

/**
 * IndexedStorage — the web build's concrete `Storage` for the core `Repo`
 * (Core Integration Guide, Phase 1 task). Persists the whole AppData blob under one
 * key; the Repo holds it in memory and calls save() after each mutation. Native
 * builds can swap a Capacitor SQLite/Preferences implementation of the same
 * interface without touching the store or any screen.
 */
const DB_NAME = "tally";
const STORE = "appdata";
const KEY = "current";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export class IndexedStorage implements Storage {
  async load(): Promise<AppData> {
    const db = await openDb();
    const value = await new Promise<AppData | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result as AppData | undefined);
      req.onerror = () => reject(req.error);
    });
    return value ?? emptyData();
  }

  async save(data: AppData): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
