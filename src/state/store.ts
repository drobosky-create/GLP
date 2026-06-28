import { create } from "zustand";
import type {
  AppMode,
  DoseEvent,
  Entitlement,
  IntakeEntry,
  Medication,
  Reminder,
  SideEffectEntry,
  Stack,
  StrengthCheckin,
  Vial,
  WeightEntry,
} from "../types";
import { db } from "../lib/db";
import { getCompound } from "../lib/peptides";
import { scheduleReminder } from "../lib/notify";
import {
  PLANS,
  captureBillingEvent,
  isPremium as computeIsPremium,
  openCheckout as billingOpenCheckout,
  purchaseViaStore as billingPurchaseViaStore,
  restorePurchases as billingRestore,
  startTrial as makeTrial,
  trialDaysLeft as computeTrialDaysLeft,
  type BillingResult,
  type Plan,
} from "../lib/billing";

// Re-exported so screens can type plans without importing the billing module
// directly (PRD §7.1: screens never touch billing).
export type { Plan, BillingResult };

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
  | "report"
  | "muscle"
  | "curve"
  | "reminders"
  | "paywall"
  | "recon"
  | "vials"
  | "library"
  | "stacks"
  | "education";

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

export interface LogIntakeInput {
  datetime: string;
  proteinG?: number;
  fiberG?: number;
  waterMl?: number;
}

export interface LogStrengthInput {
  datetime: string;
  metric: string;
  value: number;
}

export interface AddVialInput {
  compoundId: string;
  strengthMg: number;
  bacWaterMl: number;
  reconDate: string;
  discardAfter: string;
}

// Compounded mode (PRD §2) is feature-flagged OFF by default — it ships only after
// the legal-review checkpoint (§9). Enable per-build with VITE_COMPOUNDED_MODE=true.
const COMPOUNDED_ENABLED =
  (import.meta.env.VITE_COMPOUNDED_MODE as string) === "true";

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
  intakeEntries: IntakeEntry[];
  strengthCheckins: StrengthCheckin[];
  vials: Vial[];
  stacks: Stack[];
  reminders: Reminder[];

  // Compounded-mode feature flag (§2; gated on legal review, §9).
  compoundedEnabled: boolean;

  // Entitlement (§6). `premium` / `trialDaysLeft` are derived snapshots kept in
  // sync via recomputeEntitlement so screens read them reactively without touching
  // the billing module.
  entitlement: Entitlement | null;
  premium: boolean;
  trialDaysLeft: number | null;
  plans: Plan[];

  hydrate: () => Promise<void>;

  recomputeEntitlement: () => void;
  startTrial: () => Promise<void>;
  openCheckout: (planId: Plan["id"]) => Promise<BillingResult>;
  purchaseViaStore: (planId: Plan["id"]) => Promise<BillingResult>;
  restorePurchases: () => Promise<BillingResult>;

  saveReminder: (reminder: Reminder) => Promise<void>;

  logDose: (input: LogDoseInput) => Promise<void>;
  deleteDose: (id: string) => Promise<void>;
  logWeight: (input: LogWeightInput) => Promise<void>;
  deleteWeight: (id: string) => Promise<void>;
  logSideEffect: (input: LogSideEffectInput) => Promise<void>;
  deleteSideEffect: (id: string) => Promise<void>;
  logIntake: (input: LogIntakeInput) => Promise<void>;
  deleteIntake: (id: string) => Promise<void>;
  logStrength: (input: LogStrengthInput) => Promise<void>;
  deleteStrength: (id: string) => Promise<void>;
  addVial: (input: AddVialInput) => Promise<void>;
  deleteVial: (id: string) => Promise<void>;
  saveStack: (name: string, compoundIds: string[], id?: string) => Promise<void>;
  deleteStack: (id: string) => Promise<void>;
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
  intakeEntries: [],
  strengthCheckins: [],
  vials: [],
  stacks: [],
  reminders: DEFAULT_REMINDERS,
  compoundedEnabled: COMPOUNDED_ENABLED,
  entitlement: null,
  premium: false,
  trialDaysLeft: null,
  plans: PLANS,

  hydrate: async () => {
    const [
      medications,
      doseEvents,
      weightEntries,
      sideEffects,
      intakeEntries,
      strengthCheckins,
      vials,
      stacks,
      storedReminders,
      entitlement,
    ] = await Promise.all([
      db.medications.all(),
      db.doseEvents.all(),
      db.weightEntries.all(),
      db.sideEffects.all(),
      db.intakeEntries.all(),
      db.strengthCheckins.all(),
      db.vials.all(),
      db.stacks.all(),
      db.reminders.all(),
      db.entitlement.get(),
    ]);
    // Always surface both reminder kinds; overlay any stored prefs onto defaults.
    const reminders = DEFAULT_REMINDERS.map(
      (d) => storedReminders.find((r) => r.id === d.id) ?? d,
    );
    const now = Date.now();
    set({
      medications,
      doseEvents: doseEvents.sort(byNewest),
      weightEntries: weightEntries.sort(byNewest),
      sideEffects: sideEffects.sort(byNewest),
      intakeEntries: intakeEntries.sort(byNewest),
      strengthCheckins: strengthCheckins.sort(byNewest),
      vials: vials.sort((a, b) => b.reconDate.localeCompare(a.reconDate)),
      stacks: stacks.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      reminders,
      entitlement: entitlement ?? null,
      premium: computeIsPremium(entitlement ?? null, now),
      trialDaysLeft: computeTrialDaysLeft(entitlement ?? null, now),
      hydrated: true,
    });
    // Re-arm enabled reminders (web timers don't survive a reload; native is a
    // cheap reschedule of the same ids).
    for (const r of reminders) {
      if (r.enabled) void scheduleReminder(r);
    }
  },

  recomputeEntitlement: () => {
    const now = Date.now();
    const ent = get().entitlement;
    set({
      premium: computeIsPremium(ent, now),
      trialDaysLeft: computeTrialDaysLeft(ent, now),
    });
  },

  startTrial: async () => {
    const ent = makeTrial(Date.now());
    await db.entitlement.save(ent);
    await captureBillingEvent({ type: "trial_start" });
    set({ entitlement: ent });
    get().recomputeEntitlement();
  },

  openCheckout: async (planId) => {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return { ok: false, reason: "Unknown plan." };
    const res = await billingOpenCheckout(plan);
    get().recomputeEntitlement();
    return res;
  },

  purchaseViaStore: async (planId) => {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return { ok: false, reason: "Unknown plan." };
    return billingPurchaseViaStore(plan);
  },

  restorePurchases: async () => {
    const res = await billingRestore();
    get().recomputeEntitlement();
    return res;
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

  logIntake: async (input) => {
    const entry: IntakeEntry = { id: newId(), ...input };
    await db.intakeEntries.save(entry);
    set((s) => ({
      intakeEntries: [entry, ...s.intakeEntries].sort(byNewest),
    }));
  },

  deleteIntake: async (id) => {
    await db.intakeEntries.remove(id);
    set((s) => ({
      intakeEntries: s.intakeEntries.filter((e) => e.id !== id),
    }));
  },

  logStrength: async (input) => {
    const entry: StrengthCheckin = { id: newId(), ...input };
    await db.strengthCheckins.save(entry);
    set((s) => ({
      strengthCheckins: [entry, ...s.strengthCheckins].sort(byNewest),
    }));
  },

  deleteStrength: async (id) => {
    await db.strengthCheckins.remove(id);
    set((s) => ({
      strengthCheckins: s.strengthCheckins.filter((e) => e.id !== id),
    }));
  },

  addVial: async (input) => {
    const vial: Vial = { id: newId(), ...input };
    await db.vials.save(vial);
    set((s) => ({
      vials: [vial, ...s.vials].sort((a, b) =>
        b.reconDate.localeCompare(a.reconDate),
      ),
    }));
  },

  deleteVial: async (id) => {
    await db.vials.remove(id);
    set((s) => ({ vials: s.vials.filter((v) => v.id !== id) }));
  },

  saveStack: async (name, compoundIds, id) => {
    const existing = id ? get().stacks.find((s) => s.id === id) : undefined;
    const stack: Stack = {
      id: existing?.id ?? newId(),
      name,
      compoundIds,
      createdAt: existing?.createdAt ?? nowIso(),
    };
    await db.stacks.save(stack);
    set((s) => {
      const others = s.stacks.filter((x) => x.id !== stack.id);
      return {
        stacks: [stack, ...others].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      };
    });
  },

  deleteStack: async (id) => {
    await db.stacks.remove(id);
    set((s) => ({ stacks: s.stacks.filter((x) => x.id !== id) }));
  },
}));

export { nowIso };
