/**
 * db.ts — storage layer. The ONLY place that touches persistent storage (PRD §7.1,
 * §12). Screens never import this; they go through the single store, which calls
 * these functions. Local-first (§5): data lives on-device, reads/writes are local
 * so the app works offline and feels instant.
 *
 * Web target uses IndexedDB (the spec's named web store, §7). The public surface
 * below is storage-agnostic so a Capacitor SQLite plugin can replace the internals
 * on native later without touching the store or any screen.
 */

import type {
  BillingEvent,
  DoseEvent,
  Entitlement,
  IntakeEntry,
  Medication,
  Reminder,
  SideEffectEntry,
  StrengthCheckin,
  Vial,
  WeightEntry,
} from "../types";

const DB_NAME = "glp1-companion";
const DB_VERSION = 5;

// Object stores owned by this layer. Later phases append to this list and bump
// DB_VERSION; onupgradeneeded creates any missing store idempotently.
const STORES = [
  "medications",
  "doseEvents",
  "weightEntries",
  "sideEffectEntries",
  "reminders",
  "entitlement",
  "billingEvents",
  "intakeEntries",
  "strengthCheckins",
  "vials",
] as const;
type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      for (const name of STORES) {
        if (!database.objectStoreNames.contains(name)) {
          database.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  op: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(store, mode);
        const request = op(transaction.objectStore(store));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

function getAll<T>(store: StoreName): Promise<T[]> {
  return run<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

function put<T>(store: StoreName, value: T): Promise<void> {
  return run(store, "readwrite", (s) =>
    s.put(value as unknown as object),
  ).then(() => undefined);
}

function remove(store: StoreName, id: string): Promise<void> {
  return run(store, "readwrite", (s) => s.delete(id)).then(() => undefined);
}

/**
 * Typed, namespaced storage API. One entry per entity; each is the single way to
 * read/write that collection. Returns plain typed records — no storage details leak.
 */
export const db = {
  medications: {
    all: () => getAll<Medication>("medications"),
    save: (m: Medication) => put("medications", m),
    remove: (id: string) => remove("medications", id),
  },
  doseEvents: {
    all: () => getAll<DoseEvent>("doseEvents"),
    save: (d: DoseEvent) => put("doseEvents", d),
    remove: (id: string) => remove("doseEvents", id),
  },
  weightEntries: {
    all: () => getAll<WeightEntry>("weightEntries"),
    save: (w: WeightEntry) => put("weightEntries", w),
    remove: (id: string) => remove("weightEntries", id),
  },
  sideEffects: {
    all: () => getAll<SideEffectEntry>("sideEffectEntries"),
    save: (s: SideEffectEntry) => put("sideEffectEntries", s),
    remove: (id: string) => remove("sideEffectEntries", id),
  },
  reminders: {
    all: () => getAll<Reminder>("reminders"),
    save: (r: Reminder) => put("reminders", r),
    remove: (id: string) => remove("reminders", id),
  },
  // Single-record store keyed by a fixed id; the extra id is storage-internal.
  entitlement: {
    get: async (): Promise<Entitlement | undefined> => {
      const all = await getAll<Entitlement & { id: string }>("entitlement");
      return all[0];
    },
    save: (e: Entitlement) => put("entitlement", { id: "current", ...e }),
    clear: () => remove("entitlement", "current"),
  },
  billingEvents: {
    all: () => getAll<BillingEvent>("billingEvents"),
    save: (ev: BillingEvent) => put("billingEvents", ev),
  },
  intakeEntries: {
    all: () => getAll<IntakeEntry>("intakeEntries"),
    save: (e: IntakeEntry) => put("intakeEntries", e),
    remove: (id: string) => remove("intakeEntries", id),
  },
  strengthCheckins: {
    all: () => getAll<StrengthCheckin>("strengthCheckins"),
    save: (e: StrengthCheckin) => put("strengthCheckins", e),
    remove: (id: string) => remove("strengthCheckins", id),
  },
  vials: {
    all: () => getAll<Vial>("vials"),
    save: (v: Vial) => put("vials", v),
    remove: (id: string) => remove("vials", id),
  },
};
