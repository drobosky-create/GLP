/**
 * muscle.ts — protein-target + muscle-risk-flag logic (constants from Reference
 * Sheet §3). The single owner of the muscle-preservation concern (PRD §7.1).
 *
 * Everything here is GENERAL PUBLISHED GUIDANCE computed from the user's own logged
 * data — never a personalized prescription (Ref §3.2/§3.4). The risk flag is a
 * gentle, non-diagnostic nudge that refers the user OUTWARD to their provider; it
 * prescribes no number and generates no plan (Ref §3.3). It is wellness/tracking,
 * not clinical decision support. [Framing pending counsel review — PRD §9 / Ref §6.]
 */

import type { IntakeEntry, WeightEntry } from "../types";

const DAY_MS = 86_400_000;

// Published protein ranges (g/kg/day unless noted) — Reference Sheet §3.2.
export const PROTEIN = {
  rangeLowPerKg: 1.2,
  rangeHighPerKg: 1.6,
  defaultPerKg: 1.4, // conservative mid-range default
  floorPerKg: 0.5, // joint advisory: do not fall below 0.4–0.5
  ceilingPerKg: 2.0, // joint advisory: avoid sustained ≥2.0
  absoluteLow: 80, // alternative absolute target (g/day)
  absoluteHigh: 120,
  absoluteMid: 100,
  perKgLeanMass: 1.5, // most accurate basis: 1.5 g/kg fat-free mass
} as const;

/**
 * Risk thresholds (Ref §3.3). The PATTERN is sourced; these exact cut-offs are
 * product judgment and need a clinician glance before go-live (Ref §6). Labeled as
 * such in the UI; nothing here is presented as a diagnosis.
 */
export const RISK = {
  fastLossPctPerWeek: 1.0, // weight dropping ≥ ~1%/week reads as "fast"
  proteinUnderTargetFrac: 0.9, // avg intake below 90% of target = "under target"
  leanLossPctPerWeek: 0.75, // lean-mass dropping faster than this = concern
  windowDays: 7,
} as const;

function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

// ---- Lean mass ----

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100);
}

// ---- Protein target (general guidance) ----

export type ProteinBasis = "bodyWeight" | "leanMass" | "absolute";

export interface ProteinTarget {
  basis: ProteinBasis;
  low: number | null;
  high: number | null;
  target: number | null; // mid-range guidance value, g/day
  note: string;
  missing?: string; // what the user must log to use this basis
}

export function computeProteinTarget(
  basis: ProteinBasis,
  latestWeightKg?: number,
  latestBodyFatPct?: number,
): ProteinTarget {
  if (basis === "absolute") {
    return {
      basis,
      low: PROTEIN.absoluteLow,
      high: PROTEIN.absoluteHigh,
      target: PROTEIN.absoluteMid,
      note: "General published range (80–120 g/day). Your provider may set a different target.",
    };
  }

  if (basis === "leanMass") {
    if (latestWeightKg == null || latestBodyFatPct == null) {
      return {
        basis,
        low: null,
        high: null,
        target: null,
        note: "The most accurate basis uses fat-free mass.",
        missing: "Log a weight with body-fat % to use the lean-mass basis.",
      };
    }
    const lean = leanMassKg(latestWeightKg, latestBodyFatPct);
    return {
      basis,
      low: round5(lean * PROTEIN.rangeLowPerKg),
      high: round5(lean * PROTEIN.rangeHighPerKg),
      target: round5(lean * PROTEIN.perKgLeanMass),
      note: "Based on estimated fat-free mass (1.5 g/kg). General guidance — your provider may set a different target.",
    };
  }

  // bodyWeight
  if (latestWeightKg == null) {
    return {
      basis,
      low: null,
      high: null,
      target: null,
      note: "General guidance — your provider may set a different target.",
      missing: "Log a weight to use the body-weight basis.",
    };
  }
  return {
    basis,
    low: round5(latestWeightKg * PROTEIN.rangeLowPerKg),
    high: round5(latestWeightKg * PROTEIN.rangeHighPerKg),
    target: round5(latestWeightKg * PROTEIN.defaultPerKg),
    note: "General guidance (1.2–1.6 g/kg). Using actual body weight can overestimate needs for people with obesity — your provider may set a different target.",
  };
}

// ---- Protein adherence over a rolling window ----

export interface Adherence {
  daysLogged: number;
  avgProteinG: number | null;
  pctOfTarget: number | null;
  underTarget: boolean;
}

export function proteinAdherence(
  intakeEntries: IntakeEntry[],
  targetGrams: number | null,
  now: number,
  windowDays: number = RISK.windowDays,
): Adherence {
  const cutoff = now - windowDays * DAY_MS;
  const perDay = new Map<string, number>();
  for (const e of intakeEntries) {
    if (e.proteinG == null) continue;
    const t = Date.parse(e.datetime);
    if (t < cutoff || t > now) continue;
    const dayKey = new Date(t).toDateString();
    perDay.set(dayKey, (perDay.get(dayKey) ?? 0) + e.proteinG);
  }
  const daysLogged = perDay.size;
  if (daysLogged === 0) {
    return { daysLogged: 0, avgProteinG: null, pctOfTarget: null, underTarget: false };
  }
  const avg =
    [...perDay.values()].reduce((s, v) => s + v, 0) / daysLogged;
  const pct = targetGrams && targetGrams > 0 ? avg / targetGrams : null;
  return {
    daysLogged,
    avgProteinG: Math.round(avg),
    pctOfTarget: pct,
    underTarget: pct != null && pct < RISK.proteinUnderTargetFrac,
  };
}

// ---- Rates ----

/** Weight-loss rate as % of body weight per week over the window (positive = loss). */
function weightLossPctPerWeek(
  weights: WeightEntry[],
  now: number,
  windowDays: number,
): number | null {
  const cutoff = now - windowDays * DAY_MS;
  const recent = weights
    .map((w) => ({ t: Date.parse(w.datetime), w: w.weightKg }))
    .filter((p) => p.t >= cutoff && p.t <= now)
    .sort((a, b) => a.t - b.t);
  if (recent.length < 2) return null;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const days = (last.t - first.t) / DAY_MS;
  if (days <= 0 || first.w <= 0) return null;
  const pctLoss = ((first.w - last.w) / first.w) * 100;
  return (pctLoss / days) * 7;
}

/** Lean-mass loss rate as % per week, when body-fat % is logged. */
function leanLossPctPerWeek(
  weights: WeightEntry[],
  now: number,
  windowDays: number,
): number | null {
  const cutoff = now - windowDays * DAY_MS;
  const recent = weights
    .filter((w) => w.bodyFatPct != null)
    .map((w) => ({
      t: Date.parse(w.datetime),
      lean: leanMassKg(w.weightKg, w.bodyFatPct as number),
    }))
    .filter((p) => p.t >= cutoff && p.t <= now)
    .sort((a, b) => a.t - b.t);
  if (recent.length < 2) return null;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const days = (last.t - first.t) / DAY_MS;
  if (days <= 0 || first.lean <= 0) return null;
  const pctLoss = ((first.lean - last.lean) / first.lean) * 100;
  return (pctLoss / days) * 7;
}

// ---- The gentle, non-diagnostic muscle-risk flag (Ref §3.3) ----

export interface RiskResult {
  flagged: boolean;
  message: string | null;
}

export function muscleRiskFlag(
  weights: WeightEntry[],
  adherence: Adherence,
  now: number,
  windowDays: number = RISK.windowDays,
): RiskResult {
  const lossRate = weightLossPctPerWeek(weights, now, windowDays);
  const fastLoss = lossRate != null && lossRate >= RISK.fastLossPctPerWeek;

  const leanRate = leanLossPctPerWeek(weights, now, windowDays);
  const fastLeanLoss = leanRate != null && leanRate >= RISK.leanLossPctPerWeek;

  const flagged = (fastLoss && adherence.underTarget) || fastLeanLoss;
  if (!flagged) return { flagged: false, message: null };

  // Suggested copy (Ref §3.3): describes the user's own pattern, refers outward,
  // prescribes nothing.
  return {
    flagged: true,
    message:
      "Your weight has been dropping quickly and your protein has been under your target recently. Muscle protection is worth raising with your provider — protein and resistance training are the usual levers.",
  };
}
