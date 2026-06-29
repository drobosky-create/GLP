// recon.ts — Reconstitution math for the Compounded mode (PRD §8 / Reference Sheet §2).
//
// NEUTRALITY: this is a calculator only. It computes what the user asks; it never
// recommends a dose. UI must show "verify with your provider" near any result.
//
// A wrong unit count here is the worst possible bug, so the logic is deliberately
// tiny and is covered by the test suite in tests/recon.test.ts (known-good cases
// from Reference Sheet §2.2).

export type SyringeType = "U-100" | "U-50" | "U-40";

const UNITS_PER_ML: Record<SyringeType, number> = {
  "U-100": 100,
  "U-50": 50,
  "U-40": 40,
};

export interface ReconInput {
  vialStrengthMg: number;   // total peptide in the vial, in mg
  bacWaterMl: number;       // bacteriostatic water added, in mL
  desiredDoseMg: number;    // target dose per injection, in mg (use mcgToMg first if entered in mcg)
  syringe?: SyringeType;    // defaults to U-100
}

export interface ReconResult {
  concentrationMgPerMl: number;
  doseVolumeMl: number;
  units: number;            // units to draw on the chosen syringe
  dosesPerVial: number;
  syringe: SyringeType;
  exceedsSyringe: boolean;  // true if one dose won't fit in a single syringe draw
}

export function mcgToMg(mcg: number): number {
  return mcg / 1000;
}

export function reconstitute(input: ReconInput): ReconResult {
  const syringe = input.syringe ?? "U-100";
  const { vialStrengthMg, bacWaterMl, desiredDoseMg } = input;

  if (![vialStrengthMg, bacWaterMl, desiredDoseMg].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error("recon: vialStrengthMg, bacWaterMl, and desiredDoseMg must all be positive numbers.");
  }

  const concentrationMgPerMl = vialStrengthMg / bacWaterMl;
  const doseVolumeMl = desiredDoseMg / concentrationMgPerMl;
  const unitsPerMl = UNITS_PER_ML[syringe];
  const units = doseVolumeMl * unitsPerMl;
  const dosesPerVial = vialStrengthMg / desiredDoseMg;

  return {
    concentrationMgPerMl,
    doseVolumeMl,
    units,
    dosesPerVial,
    syringe,
    // a single syringe holds unitsPerMl units == 1 mL; flag if the dose won't fit
    exceedsSyringe: units > unitsPerMl,
  };
}
