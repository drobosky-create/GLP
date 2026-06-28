/**
 * Shared data model — the single source of truth for app types (PRD §8).
 *
 * These describe the user's OWN logged data plus the local entitlement record.
 * Reference data (the peptide catalog / `Compound`) lives in `lib/peptides.ts`
 * per §8.1; a `Medication` the user logs references a catalog `Compound` by id.
 *
 * Neutrality (§1.5): nothing here encodes a recommended dose, brand steer, or
 * purchase path. The user enters their own protocol; the model only reflects it.
 */

/** Onboarding routes the user to one of two modes (PRD §2). */
export type AppMode = "prescribed" | "compounded";

/** ISO-8601 timestamp string, e.g. "2026-06-27T14:30:00.000Z". */
export type ISODateTime = string;

/** A medication the user is tracking; references a catalog Compound by id (§8.1). */
export interface Medication {
  id: string;
  compoundId: string; // -> Compound.id in lib/peptides.ts
  name: string;
  type: "injectable" | "oral";
  origin: "brand" | "compounded";
}

/** A single dose the user logged. */
export interface DoseEvent {
  id: string;
  medicationId: string;
  dose: number;
  doseUnit: "mg" | "mcg" | "units";
  datetime: ISODateTime;
  injectionSite?: string;
}

/** A weight + optional body-composition entry. */
export interface WeightEntry {
  id: string;
  datetime: ISODateTime;
  weightKg: number;
  bodyFatPct?: number;
  waistCm?: number;
}

/** A logged side effect with user-rated severity (0–10). */
export interface SideEffectEntry {
  id: string;
  datetime: ISODateTime;
  type: string; // e.g. "nausea", "fatigue", "constipation"
  severity: number; // 0–10
}

/** Lightweight intake quick-log — NOT a full macro tracker (PRD §10). */
export interface IntakeEntry {
  id: string;
  datetime: ISODateTime;
  proteinG?: number;
  fiberG?: number;
  waterMl?: number;
}

/** A strength check-in (reps at fixed weight, grip, or subjective metric). */
export interface StrengthCheckin {
  id: string;
  datetime: ISODateTime;
  metric: string;
  value: number;
}

/** Compounded mode only — a reconstituted vial for inventory tracking. */
export interface Vial {
  id: string;
  compoundId: string;
  strengthMg: number;
  bacWaterMl: number;
  reconDate: ISODateTime;
  discardAfter: ISODateTime;
}

/**
 * A scheduled reminder (PRD §3 item 5). Time-based and local — dose reminders are
 * weekly (a weekday is set), weigh-in reminders are daily (no weekday). Copy is
 * neutral: it reminds the user to LOG, it never instructs them to take a medication.
 */
export interface Reminder {
  id: string; // stable per kind ("dose" | "weighin")
  kind: "dose" | "weighin";
  enabled: boolean;
  hour: number; // 0–23, local time
  minute: number; // 0–59
  weekday?: number; // ISO 1=Mon … 7=Sun; set => weekly, unset => daily
  title: string;
  body: string;
}

/** Subscription tier the entitlement grants. */
export type EntitlementTier = "free" | "trial" | "premium";

/** Local cached entitlement, reconciled from Stripe (web) + store receipts (§6). */
export interface Entitlement {
  tier: EntitlementTier;
  trialEnd?: ISODateTime;
  stripeCustomerId?: string;
}

/**
 * A captured billing event. PRD §6 wants link-purchase analytics from day one and
 * the architecture ready to switch on Apple's Link-Entitlement reporting later — so
 * every checkout/IAP/trial action is recorded locally as one of these.
 */
export interface BillingEvent {
  id: string;
  datetime: ISODateTime;
  type:
    | "trial_start"
    | "checkout_start"
    | "iap_attempt"
    | "restore_attempt";
  channel?: "stripe_link" | "store_iap";
  plan?: string;
}
