/**
 * recon.ts — reconstitution math (compounded mode only). The single owner of this
 * concern (PRD §7.1). Pure arithmetic from Reference Sheet §2 — a wrong unit count
 * in a health context is the worst possible bug, so the math is covered by the
 * known-good test suite in /tests/recon.test.ts, which MUST pass before the feature
 * is exposed (PRD §11). The UI shows a persistent "calculator only — verify with
 * your provider" notice (Ref §2.3), and this stays behind a feature flag pending the
 * legal-review checkpoint (PRD §9).
 */

export type SyringeType = "U-100" | "U-50" | "U-40";

// Units per mL per syringe type. U-100 is the default; the ×100 factor is a
// PARAMETER here, never a magic number, so U-40/U-50 are a data change (Ref §2.3).
export const SYRINGE_UNITS_PER_ML: Record<SyringeType, number> = {
  "U-100": 100,
  "U-50": 50,
  "U-40": 40,
};

// Standard barrel capacity (mL) used for the "dose exceeds one syringe" guard.
export const DEFAULT_SYRINGE_CAPACITY_ML = 1;

/** Convert micrograms to milligrams before using the formulas (Ref §2.1). */
export function mcgToMg(mcg: number): number {
  return mcg / 1000;
}

export interface ReconInput {
  vialStrengthMg: number;
  bacWaterMl: number;
  desiredDoseMg: number; // convert mcg→mg first
  syringe?: SyringeType; // default U-100
  syringeCapacityMl?: number; // default 1 mL
}

export interface ReconResult {
  valid: boolean; // inputs are usable
  errors: string[]; // blocking input problems
  concentrationMgPerMl: number;
  doseVolumeMl: number;
  unitsOnSyringe: number; // exact
  unitsDisplay: number; // rounded to nearest 0.5 for display only
  dosesPerVial: number;
  exceedsSyringe: boolean; // dose volume larger than one syringe
}

const EMPTY = {
  concentrationMgPerMl: 0,
  doseVolumeMl: 0,
  unitsOnSyringe: 0,
  unitsDisplay: 0,
  dosesPerVial: 0,
  exceedsSyringe: false,
};

/**
 * Reconstitution math (Ref §2.1). Computes on EXACT values; only unitsDisplay is
 * rounded (to the nearest 0.5, per syringe gradations, Ref §2.3).
 */
export function computeRecon(input: ReconInput): ReconResult {
  const syringe = input.syringe ?? "U-100";
  const unitsPerMl = SYRINGE_UNITS_PER_ML[syringe];
  const capacity = input.syringeCapacityMl ?? DEFAULT_SYRINGE_CAPACITY_ML;

  const errors: string[] = [];
  if (!(input.vialStrengthMg > 0))
    errors.push("Vial strength must be greater than 0.");
  if (!(input.bacWaterMl > 0))
    errors.push("BAC water must be greater than 0.");
  if (!(input.desiredDoseMg > 0))
    errors.push("Desired dose must be greater than 0.");
  if (errors.length > 0) {
    return { valid: false, errors, ...EMPTY };
  }

  const concentrationMgPerMl = input.vialStrengthMg / input.bacWaterMl;
  const doseVolumeMl = input.desiredDoseMg / concentrationMgPerMl;
  const unitsOnSyringe = doseVolumeMl * unitsPerMl;
  const dosesPerVial = input.vialStrengthMg / input.desiredDoseMg;
  const exceedsSyringe = doseVolumeMl > capacity;

  return {
    valid: true,
    errors,
    concentrationMgPerMl,
    doseVolumeMl,
    unitsOnSyringe,
    unitsDisplay: Math.round(unitsOnSyringe * 2) / 2,
    dosesPerVial,
    exceedsSyringe,
  };
}
