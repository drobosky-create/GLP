// pk.ts — Medication-level curve MATH only (Reference Sheet §1). Reads peptides.ts.
//
// IMPORTANT FRAMING (PRD §1.3): this produces a RELATIVE, illustrative curve of
// "estimated amount in system," NOT a clinical plasma measurement. The UI must
// label it as estimated/educational, and for any compound with verified=false it
// must additionally show a low-confidence label. This module never advises timing
// or dose changes — it only visualizes the user's own logged doses.

import { Compound, compoundById } from "./peptides";

export interface DoseEvent {
  /** hours since an arbitrary t0 (e.g. first dose). Keep all events on one timeline. */
  atHours: number;
  /** amount in the compound's doseUnit. Relative units are fine; the curve is relative. */
  amount: number;
}

/** Elimination rate constant k = ln(2) / half-life. */
export function decayConstant(halfLifeHours: number): number {
  return Math.LN2 / halfLifeHours;
}

/** Single-dose remaining fraction after `elapsedHours`. */
export function remainingFraction(elapsedHours: number, halfLifeHours: number): number {
  if (elapsedHours < 0) return 0;
  return Math.exp(-decayConstant(halfLifeHours) * elapsedHours);
}

/**
 * Total relative level at time `atHours`, summing the exponential decay of every
 * prior dose (superposition). This is what produces the saw-tooth that plateaus
 * at steady state.
 */
export function levelAtTime(events: DoseEvent[], atHours: number, halfLifeHours: number): number {
  const k = decayConstant(halfLifeHours);
  let total = 0;
  for (const e of events) {
    if (e.atHours <= atHours) {
      total += e.amount * Math.exp(-k * (atHours - e.atHours));
    }
  }
  return total;
}

export interface CurvePoint { tHours: number; level: number; }

/** Sample the curve for charting between startHours and endHours at a fixed step. */
export function curveSeries(
  events: DoseEvent[],
  halfLifeHours: number,
  startHours: number,
  endHours: number,
  stepHours = 6,
): CurvePoint[] {
  const out: CurvePoint[] = [];
  for (let t = startHours; t <= endHours; t += stepHours) {
    out.push({ tHours: t, level: levelAtTime(events, t, halfLifeHours) });
  }
  return out;
}

/** Hours of consistent dosing to reach ~steady state (≈5 half-lives, ~96.9%). */
export function hoursToSteadyState(halfLifeHours: number): number {
  return 5 * halfLifeHours;
}

/** Convenience: resolve a compound from the catalog and build its curve. */
export function curveForCompound(
  compoundId: string,
  events: DoseEvent[],
  startHours: number,
  endHours: number,
  stepHours = 6,
): { points: CurvePoint[]; compound: Compound; lowConfidence: boolean } {
  const compound = compoundById(compoundId);
  if (!compound) throw new Error(`pk: unknown compound "${compoundId}"`);
  return {
    points: curveSeries(events, compound.halfLifeHours, startHours, endHours, stepHours),
    compound,
    lowConfidence: !compound.verified || compound.confidence === "low",
  };
}
