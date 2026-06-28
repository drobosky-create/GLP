import { create } from "zustand";
import type {
  AppMode,
  DoseEvent,
  Medication,
  Reminder,
  SideEffectEntry,
  WeightEntry,
} from "../types";
import { db } from "../lib/db";
import { getCompound } from "../lib/peptides";
import { scheduleReminder } from "../lib/notify";

// Neutral defaults — both off until the user opts in. Copy reminds the user to LOG,
// never to take a medication (§1.5). Dose = weekly (GLP-1 cadence); weigh-in = daily.
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

/**
 * The single app store (PRD §7.1, §12) — the one source of UI state. Screens read
 * from here and call these actions; the actions are the orchestrators that persist
 * through db.ts (the only DB owner) and then update in-memory state. Screens never
 * touch db.ts directly.
 */

export type Screen =
  | "home"
  | "dose"
  | "weight"
  | "effects"
  | "sites"
  | "reminders";

const newId = (): string => crypto.randomUUID();
const nowIso = (): string => new Date().toISOString();

const byNewest = (a: { datetime: string }, b: { datetime: string }): number =>
  b.datetime.localeCompare(a.datetime);

export interface LogDoseInput {
  compoundId: string;
  dose: number;
  doseUnit: DoseEvent["doseUnit"];
  datetime: string;
  injectionSite?: string;
}

export interface LogWeightInput {
  datetime: string;
  weightKg: number;
  bodyFatPct?: number;
  waistCm?: number;
}

export interface LogSideEffectInput {
  datetime: string;
  type: string;
  severity: number;
}

interface AppState {
  // Onboarding mode (§2) — null until chosen.
  mode: AppMode | null;
  setMode: (mode: AppMode) => void;

  // Lightweight in-app navigation (no router dependency); §5 keeps every log
  // screen reachable without a restart.
  screen: Screen;
  setScreen: (screen: Screen) => void;

  // Local-first data, hydrated from db.ts on launch.
  hydrated: boolean;
  medications: Medication[];
  doseEvents: DoseEvent[];
  weightEntries: WeightEntry[];
  sideEffects: SideEffectEntry[];
  reminders: Reminder[];

  hydrate: () => Promise<void>;

  saveReminder: (reminder: Reminder) => Promise<void>;

  logDose: (input: LogDoseInput) => Promise<void>;
  deleteDose: (id: string) => Promise<void>;
  logWeight: (input: LogWeightInput) => Promise<void>;
  deleteWeight: (id: string) => Promise<void>;
  logSideEffect: (input: LogSideEffectInput) => Promise<void>;
  deleteSideEffect: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: null,
  setMode: (mode) => set({ mode }),

  screen: "home",
  setScreen: (screen) => set({ screen }),

  hydrated: false,
  medications: [],
  doseEvents: [],
  weightEntries: [],
  sideEffects: [],
  reminders: DEFAULT_REMINDERS,

  hydrate: async () => {
    const [medications, doseEvents, weightEntries, sideEffects, storedReminders] =
      await Promise.all([
        db.medications.all(),
        db.doseEvents.all(),
        db.weightEntries.all(),
        db.sideEffects.all(),
        db.reminders.all(),
      ]);
    // Always surface both reminder kinds; overlay any stored prefs onto defaults.
    const reminders = DEFAULT_REMINDERS.map(
      (d) => storedReminders.find((r) => r.id === d.id) ?? d,
    );
    set({
      medications,
      doseEvents: doseEvents.sort(byNewest),
      weightEntries: weightEntries.sort(byNewest),
      sideEffects: sideEffects.sort(byNewest),
      reminders,
      hydrated: true,
    });
    // Re-arm enabled reminders (web timers don't survive a reload; native is a
    // cheap reschedule of the same ids).
    for (const r of reminders) {
      if (r.enabled) void scheduleReminder(r);
    }
  },

  saveReminder: async (reminder) => {
    await db.reminders.save(reminder);
    await scheduleReminder(reminder); // schedules if enabled, cancels if not
    set((s) => ({
      reminders: s.reminders.map((r) => (r.id === reminder.id ? reminder : r)),
    }));
  },

  logDose: async (input) => {
    // Ensure a Medication exists for this catalog compound, then attach the dose.
    let medication = get().medications.find(
      (m) => m.compoundId === input.compoundId,
    );
    if (!medication) {
      const compound = getCompound(input.compoundId);
      medication = {
        id: newId(),
        compoundId: input.compoundId,
        name: compound?.displayName ?? input.compoundId,
        type: compound?.route === "oral" ? "oral" : "injectable",
        origin: get().mode === "compounded" ? "compounded" : "brand",
      };
      await db.medications.save(medication);
      set((s) => ({ medications: [...s.medications, medication!] }));
    }

    const dose: DoseEvent = {
      id: newId(),
      medicationId: medication.id,
      dose: input.dose,
      doseUnit: input.doseUnit,
      datetime: input.datetime,
      injectionSite: input.injectionSite,
    };
    await db.doseEvents.save(dose);
    set((s) => ({ doseEvents: [dose, ...s.doseEvents].sort(byNewest) }));
  },

  deleteDose: async (id) => {
    await db.doseEvents.remove(id);
    set((s) => ({ doseEvents: s.doseEvents.filter((d) => d.id !== id) }));
  },

  logWeight: async (input) => {
    const entry: WeightEntry = { id: newId(), ...input };
    await db.weightEntries.save(entry);
    set((s) => ({ weightEntries: [entry, ...s.weightEntries].sort(byNewest) }));
  },

  deleteWeight: async (id) => {
    await db.weightEntries.remove(id);
    set((s) => ({ weightEntries: s.weightEntries.filter((w) => w.id !== id) }));
  },

  logSideEffect: async (input) => {
    const entry: SideEffectEntry = { id: newId(), ...input };
    await db.sideEffects.save(entry);
    set((s) => ({ sideEffects: [entry, ...s.sideEffects].sort(byNewest) }));
  },

  deleteSideEffect: async (id) => {
    await db.sideEffects.remove(id);
    set((s) => ({ sideEffects: s.sideEffects.filter((e) => e.id !== id) }));
  },
}));

export { nowIso };
