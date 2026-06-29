import { create } from "zustand";
import type {
  DoseEvent,
  Entitlement,
  IntakeEntry,
  SideEffectEntry,
  StrengthCheckin,
  Vial,
  WeightEntry,
} from "../types";
import { Repo } from "../lib/db";
import { IndexedStorage } from "./indexedStorage";
import {
  applyPurchase,
  startTrial as makeTrial,
  type PurchaseResult,
} from "../lib/billing";
import type { PurchaseChannel } from "../types";
import { scheduleReminder, type Reminder } from "../lib/notify";
import {
  newWeightSamples,
  readWeightSamples,
  requestHealthPermissions,
} from "../lib/health";
import {
  addPhoto as addPhotoRecord,
  allPhotos,
  removePhoto,
} from "../lib/photos";

const DAY_MS = 86_400_000;

/** The one Repo instance, backed by IndexedDB (Core Integration Guide). */
const repo = new Repo(new IndexedStorage());

export const nowMs = (): number => Date.now();

export type AppMode = "prescribed" | "compounded";

export type Screen =
  | "home"
  | "dose"
  | "weight"
  | "effects"
  | "sites"
  | "report"
  | "muscle"
  | "curve"
  | "reminders"
  | "paywall"
  | "recon"
  | "vials"
  | "library"
  | "stacks"
  | "education"
  | "photos";

/** A user-defined stack — app-layer, not part of the clinical core (kept in prefs). */
export interface Stack {
  id: string;
  name: string;
  compoundIds: string[];
  createdAt: number;
}

/** A progress photo surfaced to the UI: metadata + a session object URL. */
export interface PhotoItem {
  id: string;
  at: number;
  note?: string;
  url: string;
}

const DEFAULT_REMINDERS: Reminder[] = [
  {
    id: "dose",
    kind: "dose",
    enabled: false,
    hour: 9,
    minute: 0,
    weekday: 1,
    title: "Dose reminder",
    body: "A reminder to log your dose.",
  },
  {
    id: "weighin",
    kind: "weighin",
    enabled: false,
    hour: 8,
    minute: 0,
    title: "Weigh-in reminder",
    body: "A reminder to log your weight.",
  },
];

// App-layer prefs that aren't part of the persisted clinical core (AppData).
interface Prefs {
  mode: AppMode | null;
  reminders: Reminder[];
  stacks: Stack[];
}
const PREFS_KEY = "tally.prefs";

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return {
        mode: p.mode ?? null,
        reminders: p.reminders?.length ? p.reminders : DEFAULT_REMINDERS,
        stacks: p.stacks ?? [],
      };
    }
  } catch {
    /* ignore */
  }
  return { mode: null, reminders: DEFAULT_REMINDERS, stacks: [] };
}

function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

const newLocalId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const COMPOUNDED_ENABLED =
  (import.meta.env.VITE_COMPOUNDED_MODE as string) === "true";
const EDUCATION_ENABLED =
  (import.meta.env.VITE_EDUCATION_ENABLED as string) === "true";

const byNewest = (a: { at: number }, b: { at: number }): number => b.at - a.at;

interface AppState {
  mode: AppMode | null;
  setMode: (mode: AppMode) => void;
  clearMode: () => void;

  screen: Screen;
  setScreen: (screen: Screen) => void;

  hydrated: boolean;

  // Mirror of the Repo snapshot (display order: newest first).
  doses: DoseEvent[];
  weights: WeightEntry[];
  sideEffects: SideEffectEntry[];
  intake: IntakeEntry[];
  strength: StrengthCheckin[];
  vials: Vial[];
  entitlement: Entitlement;

  reminders: Reminder[];
  stacks: Stack[];
  photos: PhotoItem[];

  compoundedEnabled: boolean;
  educationEnabled: boolean;
  educationArticleId: string | null;
  setEducationArticle: (id: string | null) => void;

  hydrate: () => Promise<void>;
  refresh: () => void;

  logDose: (d: Omit<DoseEvent, "id">) => Promise<void>;
  logWeight: (w: Omit<WeightEntry, "id">) => Promise<void>;
  logSideEffect: (s: Omit<SideEffectEntry, "id">) => Promise<void>;
  logIntake: (i: Omit<IntakeEntry, "id">) => Promise<void>;
  logStrength: (s: Omit<StrengthCheckin, "id">) => Promise<void>;
  addVial: (v: Omit<Vial, "id">) => Promise<void>;

  deleteDose: (id: string) => Promise<void>;
  deleteWeight: (id: string) => Promise<void>;
  deleteSideEffect: (id: string) => Promise<void>;
  deleteStrength: (id: string) => Promise<void>;
  deleteVial: (id: string) => Promise<void>;

  syncHealth: () => Promise<{ added: number; reason: string }>;

  refreshPhotos: () => Promise<void>;
  addProgressPhoto: (blob: Blob, at: number, note?: string) => Promise<void>;
  deleteProgressPhoto: (id: string) => Promise<void>;

  startTrial: () => Promise<void>;
  applyConfirmedPurchase: (
    channel: PurchaseChannel,
    result: PurchaseResult,
  ) => Promise<void>;

  saveReminder: (reminder: Reminder) => Promise<void>;
  saveStack: (name: string, compoundIds: string[], id?: string) => void;
  deleteStack: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: null,
  setMode: (mode) => {
    set({ mode });
    savePrefs({ mode, reminders: get().reminders, stacks: get().stacks });
  },
  clearMode: () => {
    set({ mode: null });
    savePrefs({ mode: null, reminders: get().reminders, stacks: get().stacks });
  },

  screen: "home",
  setScreen: (screen) => set({ screen }),

  hydrated: false,
  doses: [],
  weights: [],
  sideEffects: [],
  intake: [],
  strength: [],
  vials: [],
  entitlement: { tier: "free" },

  reminders: DEFAULT_REMINDERS,
  stacks: [],
  photos: [],

  compoundedEnabled: COMPOUNDED_ENABLED,
  educationEnabled: EDUCATION_ENABLED,
  educationArticleId: null,
  setEducationArticle: (id) => set({ educationArticleId: id }),

  refresh: () => {
    const s = repo.snapshot();
    set({
      doses: [...s.doses].sort(byNewest),
      weights: [...s.weights].sort(byNewest),
      sideEffects: [...s.sideEffects].sort(byNewest),
      intake: [...s.intake].sort(byNewest),
      strength: [...s.strength].sort(byNewest),
      vials: [...s.vials].sort((a, b) => b.reconAt - a.reconAt),
      entitlement: s.entitlement,
    });
  },

  hydrate: async () => {
    await repo.init();
    const prefs = loadPrefs();
    get().refresh();
    set({
      mode: prefs.mode,
      reminders: prefs.reminders,
      stacks: prefs.stacks,
      hydrated: true,
    });
    for (const r of prefs.reminders) if (r.enabled) void scheduleReminder(r);
    await get().refreshPhotos();
  },

  refreshPhotos: async () => {
    const records = (await allPhotos()).sort((a, b) => b.at - a.at);
    // Reuse the object URL of any photo that still exists, and revoke only the
    // URLs of photos that are gone. Revoking a URL that a still-mounted <img>
    // points at causes a net::ERR_FILE_NOT_FOUND, so never revoke survivors.
    const prev = get().photos;
    const prevById = new Map(prev.map((p) => [p.id, p]));
    const liveIds = new Set(records.map((r) => r.id));
    for (const p of prev) if (!liveIds.has(p.id)) URL.revokeObjectURL(p.url);
    set({
      photos: records.map(
        (r) =>
          prevById.get(r.id) ?? {
            id: r.id,
            at: r.at,
            note: r.note,
            url: URL.createObjectURL(r.blob),
          },
      ),
    });
  },

  addProgressPhoto: async (blob, at, note) => {
    await addPhotoRecord({ at, blob, note });
    await get().refreshPhotos();
  },

  deleteProgressPhoto: async (id) => {
    await removePhoto(id);
    await get().refreshPhotos();
  },

  logDose: async (d) => {
    await repo.addDose(d);
    get().refresh();
  },
  logWeight: async (w) => {
    await repo.addWeight(w);
    get().refresh();
  },
  logSideEffect: async (s) => {
    await repo.addSideEffect(s);
    get().refresh();
  },
  logIntake: async (i) => {
    await repo.addIntake(i);
    get().refresh();
  },
  logStrength: async (s) => {
    await repo.addStrength(s);
    get().refresh();
  },
  addVial: async (v) => {
    await repo.addVial(v);
    get().refresh();
  },

  deleteDose: async (id) => {
    await repo.removeDose(id);
    get().refresh();
  },
  deleteWeight: async (id) => {
    await repo.removeWeight(id);
    get().refresh();
  },
  deleteSideEffect: async (id) => {
    await repo.removeSideEffect(id);
    get().refresh();
  },
  deleteStrength: async (id) => {
    await repo.removeStrength(id);
    get().refresh();
  },
  deleteVial: async (id) => {
    await repo.removeVial(id);
    get().refresh();
  },

  syncHealth: async () => {
    const perm = await requestHealthPermissions();
    if (!perm.ok) return { added: 0, reason: perm.reason };
    const samples = await readWeightSamples(Date.now() - 90 * DAY_MS);
    const existing = get().weights.map((w) => ({ at: w.at, weightKg: w.weightKg }));
    const fresh = newWeightSamples(samples, existing);
    for (const s of fresh) await repo.addWeight({ at: s.at, weightKg: s.weightKg });
    get().refresh();
    return {
      added: fresh.length,
      reason: fresh.length
        ? `Imported ${fresh.length} weight reading${fresh.length === 1 ? "" : "s"}.`
        : "No new readings to import.",
    };
  },

  startTrial: async () => {
    const ent = makeTrial(Date.now(), 7, repo.entitlement());
    await repo.setEntitlement(ent);
    get().refresh();
  },
  applyConfirmedPurchase: async (channel, result) => {
    const ent = applyPurchase(channel, result, repo.entitlement());
    await repo.setEntitlement(ent);
    get().refresh();
  },

  saveReminder: async (reminder) => {
    const reminders = get().reminders.map((r) =>
      r.id === reminder.id ? reminder : r,
    );
    set({ reminders });
    savePrefs({ mode: get().mode, reminders, stacks: get().stacks });
    await scheduleReminder(reminder);
  },

  saveStack: (name, compoundIds, id) => {
    const existing = id ? get().stacks.find((s) => s.id === id) : undefined;
    const stack: Stack = {
      id: existing?.id ?? newLocalId(),
      name,
      compoundIds,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    const stacks = [stack, ...get().stacks.filter((s) => s.id !== stack.id)].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    set({ stacks });
    savePrefs({ mode: get().mode, reminders: get().reminders, stacks });
  },
  deleteStack: (id) => {
    const stacks = get().stacks.filter((s) => s.id !== id);
    set({ stacks });
    savePrefs({ mode: get().mode, reminders: get().reminders, stacks });
  },
}));
