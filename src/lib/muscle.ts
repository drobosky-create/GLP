// muscle.ts — Muscle-preservation logic (Reference Sheet §3).
//
// NEUTRALITY / SAFETY (PRD §1.5, §9, Reference Sheet §3.4):
//  - Everything here is GENERAL PUBLISHED GUIDANCE, never a personal prescription.
//  - The risk flag is a soft, non-diagnostic nudge that refers the user to their
//    provider. It never tells the user to change medication, dose, or eat a plan.
//  - The exact rolling-window CUTOFFS below are product defaults and are marked
//    [VERIFY] — have a clinician review them before they go live.

export type ProteinBasis = "bodyWeight" | "leanMass";

export interface ProteinTargetRange {
  lowGramsPerDay: number;
  highGramsPerDay: number;
  basis: ProteinBasis;
  note: string;
}

// Published ranges (Reference Sheet §3.2). Active weight-loss commonly cited 1.2–1.6 g/kg.
const G_PER_KG_LOW = 1.2;
const G_PER_KG_HIGH = 1.6;
// Joint-advisory guardrails:
const FLOOR_G_PER_KG = 0.5;   // do not go below ~0.4–0.5 g/kg/day
const CEILING_G_PER_KG = 2.0; // avoid sustained >= 2.0 g/kg/day
const ABSOLUTE_FLOOR = 80;    // alternative absolute target 80–120 g/day
const ABSOLUTE_CEILING = 120;

/**
 * General protein target RANGE. `massKg` is body weight (or lean/fat-free mass if
 * basis="leanMass", which §3.2 notes is the most accurate basis). Result is clamped
 * to the published guardrails. Present in UI as guidance, not a prescription.
 */
export function proteinTargetRange(massKg: number, basis: ProteinBasis = "bodyWeight"): ProteinTargetRange {
  if (!Number.isFinite(massKg) || massKg <= 0) {
    throw new Error("muscle: massKg must be a positive number.");
  }
  const low = Math.max(massKg * G_PER_KG_LOW, ABSOLUTE_FLOOR);
  const high = Math.min(massKg * G_PER_KG_HIGH, massKg * CEILING_G_PER_KG);
  return {
    lowGramsPerDay: Math.round(Math.max(low, massKg * FLOOR_G_PER_KG)),
    highGramsPerDay: Math.round(Math.min(high, Math.max(high, ABSOLUTE_CEILING))),
    basis,
    note:
      basis === "leanMass"
        ? "General guidance (~1.2–1.6 g/kg of lean mass). Your provider may set a different target."
        : "General guidance (~1.2–1.6 g/kg body weight). Using total body weight can overestimate needs; your provider may set a different target.",
  };
}

export interface MuscleRiskInput {
  startWeightKg: number;
  currentWeightKg: number;
  weeksElapsed: number;
  /** avg daily protein over the recent window, grams */
  avgDailyProteinG: number;
  /** the user's chosen daily target, grams */
  proteinTargetG: number;
}

export interface MuscleRiskResult {
  flagged: boolean;
  weeklyLossPctOfBody: number;
  proteinGapG: number; // positive => under target
  message?: string;
}

// --- TUNABLE thresholds [VERIFY with a clinician before launch] ---
const FAST_LOSS_PCT_PER_WEEK = 1.0; // losing >1% of body weight/week is "fast"
const PROTEIN_UNDER_FRACTION = 0.85; // averaging <85% of target counts as "under"

/**
 * Soft, non-diagnostic risk pattern (Reference Sheet §3.3): fast weight loss AND
 * protein consistently under target. Returns a gentle, provider-referring message.
 */
export function muscleRiskFlag(input: MuscleRiskInput): MuscleRiskResult {
  const { startWeightKg, currentWeightKg, weeksElapsed, avgDailyProteinG, proteinTargetG } = input;
  if (weeksElapsed <= 0 || startWeightKg <= 0) {
    return { flagged: false, weeklyLossPctOfBody: 0, proteinGapG: 0 };
  }
  const lostKg = startWeightKg - currentWeightKg;
  const weeklyLossPctOfBody = (lostKg / startWeightKg) * 100 / weeksElapsed;
  const proteinGapG = proteinTargetG - avgDailyProteinG;

  const lossFast = weeklyLossPctOfBody > FAST_LOSS_PCT_PER_WEEK;
  const proteinUnder = avgDailyProteinG < proteinTargetG * PROTEIN_UNDER_FRACTION;

  const flagged = lossFast && proteinUnder;
  return {
    flagged,
    weeklyLossPctOfBody,
    proteinGapG,
    message: flagged
      ? "Your weight has been dropping quickly and your protein has been under your target. " +
        "Muscle protection is worth raising with your provider — protein and resistance training are the usual levers."
      : undefined,
  };
}
