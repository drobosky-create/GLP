// types.ts — the shared data model (PRD §8). All times are epoch milliseconds.
// Screens and lib modules import these; this file owns the shapes.

export type ID = string;

export interface Medication {
  id: ID;
  compoundId: ID;        // references peptides.ts Compound.id
  label?: string;        // optional user label, e.g. "morning stack"
}

export interface DoseEvent {
  id: ID;
  compoundId: ID;
  doseMg: number;
  at: number;            // epoch ms
  injectionSite?: string;
}

export interface WeightEntry {
  id: ID;
  at: number;
  weightKg: number;
  bodyFatPct?: number;
  waistCm?: number;
}

export type SideEffectType =
  | "nausea" | "fatigue" | "constipation" | "diarrhea"
  | "headache" | "injection_site" | "appetite_loss" | "other";

export interface SideEffectEntry {
  id: ID;
  at: number;
  type: SideEffectType;
  severity: number;      // 0–3 (none/mild/moderate/severe)
  note?: string;
}

export interface IntakeEntry {
  id: ID;
  at: number;
  proteinG?: number;
  fiberG?: number;
  waterMl?: number;
}

export interface StrengthCheckin {
  id: ID;
  at: number;
  metric: string;        // e.g. "grip", "reps@fixed"
  value: number;
}

export interface Vial {            // compounded mode
  id: ID;
  compoundId: ID;
  strengthMg: number;
  bacWaterMl: number;
  reconAt: number;
  discardAfter?: number;
}

export type PurchaseChannel = "stripe_link" | "apple_iap" | "google_iap";

export interface Entitlement {
  tier: "free" | "pro";   // paid plan status (trial is a separate overlay)
  trialEnd?: number;       // epoch ms; trial active while now < trialEnd
  paidUntil?: number;      // epoch ms; current paid period end
  autoRenew?: boolean;
  channel?: PurchaseChannel;
  stripeCustomerId?: string;
}

// Collections the storage layer persists.
export interface AppData {
  medications: Medication[];
  doses: DoseEvent[];
  weights: WeightEntry[];
  sideEffects: SideEffectEntry[];
  intake: IntakeEntry[];
  strength: StrengthCheckin[];
  vials: Vial[];
  entitlement: Entitlement;
}
