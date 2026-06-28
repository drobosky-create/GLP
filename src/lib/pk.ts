/**
 * pk.ts — medication-level curve MATH only (model from Reference Sheet §1). Reads
 * compound half-lives from peptides.ts; it owns no catalog data and no UI.
 *
 * This is a RELATIVE-concentration visualization, NOT a plasma measurement: it
 * superimposes single-compartment exponential decay from each of the user's logged
 * doses (Ref §1.2). It must never be used to suggest dose timing or changes, and the
 * model applies no age/weight/sex pseudo-personalization (Ref §1.3). Any compound
 * with verified:false must be rendered "estimated, low-confidence" by the UI (§8.1).
 */

import type { Compound, Confidence } from "./peptides";

const HOUR_MS = 3_600_000;
const MAX_POINTS = 220;

/** Decay constant k = ln(2) / half-life (Ref §1.2), in per-hour units. */
export function decayConstant(halfLifeHours: number): number {
  return Math.LN2 / halfLifeHours;
}

export interface DoseInput {
  t: number; // injection time (ms epoch)
  dose: number;
}

/** Relative level at time t = Σ dose·e^(−k·Δt) over all prior doses (superposition). */
export function levelAt(doses: DoseInput[], k: number, t: number): number {
  let sum = 0;
  for (const d of doses) {
    if (d.t > t) continue;
    sum += d.dose * Math.exp(-k * ((t - d.t) / HOUR_MS));
  }
  return sum;
}

export interface CurvePoint {
  t: number;
  level: number;
}

export interface CurveModel {
  hasData: boolean;
  points: CurvePoint[];
  doseTimes: number[];
  startT: number | null;
  nowT: number;
  currentLevel: number;
  peakLevel: number;
  steadyStateT: number | null;
  weeksToSteadyState: number;
  atSteadyState: boolean;
  halfLifeHours: number;
  unitLabel: string;
  estimated: boolean; // compound.verified === false
  confidence: Confidence;
}

/**
 * Builds the curve from the user's OWN logged doses only (no fabricated future
 * doses). Steady state ≈ 4–5 half-lives of consistent dosing (Ref §1.2); we use 4.5
 * to surface "stabilizing around week X" relative to the actual start date.
 */
export function buildCurve(
  doses: DoseInput[],
  compound: Compound,
  now: number,
): CurveModel {
  const k = decayConstant(compound.halfLifeHours);
  const sorted = doses
    .filter((d) => d.dose > 0 && Number.isFinite(d.t))
    .sort((a, b) => a.t - b.t);
  const hasData = sorted.length > 0;
  const startT = hasData ? sorted[0].t : null;

  const steadyHoursFromStart = 4.5 * compound.halfLifeHours;
  const steadyStateT =
    startT != null ? startT + steadyHoursFromStart * HOUR_MS : null;
  const weeksToSteadyState = Math.max(1, Math.round(steadyHoursFromStart / 24 / 7));
  const atSteadyState = steadyStateT != null && now >= steadyStateT;

  const points: CurvePoint[] = [];
  let peakLevel = 0;
  if (hasData && startT != null) {
    const span = Math.max(HOUR_MS, now - startT);
    const step = Math.max(HOUR_MS, span / MAX_POINTS);
    for (let t = startT; t < now; t += step) {
      const level = levelAt(sorted, k, t);
      points.push({ t, level });
      if (level > peakLevel) peakLevel = level;
    }
    const levelNow = levelAt(sorted, k, now);
    points.push({ t: now, level: levelNow });
    if (levelNow > peakLevel) peakLevel = levelNow;
  }

  return {
    hasData,
    points,
    doseTimes: sorted.map((d) => d.t),
    startT,
    nowT: now,
    currentLevel: hasData ? levelAt(sorted, k, now) : 0,
    peakLevel,
    steadyStateT,
    weeksToSteadyState,
    atSteadyState,
    halfLifeHours: compound.halfLifeHours,
    unitLabel: compound.doseUnit,
    estimated: compound.verified === false,
    confidence: compound.confidence,
  };
}
