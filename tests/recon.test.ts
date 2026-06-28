/**
 * recon.test.ts — the reconstitution math test suite (Reference Sheet §2.2).
 * These known-good cases MUST pass before the compounded-mode calculator is exposed
 * (PRD §11 / §7.1). Runs on Node's built-in test runner with native TS stripping —
 * no test-framework dependency: `node --test tests/recon.test.ts`.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { computeRecon, mcgToMg } from "../src/lib/recon.ts";

const approx = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);

// Reference Sheet §2.2 — | vial | bac | dose | conc | vol | units (U-100) | doses |
const CASES = [
  { vial: 5, bac: 2, doseMg: mcgToMg(250), conc: 2.5, vol: 0.1, units: 10, doses: 20 },
  { vial: 5, bac: 1, doseMg: mcgToMg(250), conc: 5, vol: 0.05, units: 5, doses: 20 },
  { vial: 10, bac: 1, doseMg: 0.5, conc: 10, vol: 0.05, units: 5, doses: 20 },
  { vial: 10, bac: 2, doseMg: 2.5, conc: 5, vol: 0.5, units: 50, doses: 4 },
  { vial: 15, bac: 3, doseMg: 5, conc: 5, vol: 1.0, units: 100, doses: 3 },
];

for (const c of CASES) {
  test(`recon ${c.vial}mg / ${c.bac}mL / ${c.doseMg}mg -> ${c.units} units`, () => {
    const r = computeRecon({
      vialStrengthMg: c.vial,
      bacWaterMl: c.bac,
      desiredDoseMg: c.doseMg,
    });
    assert.equal(r.valid, true);
    approx(r.concentrationMgPerMl, c.conc);
    approx(r.doseVolumeMl, c.vol);
    approx(r.unitsOnSyringe, c.units);
    approx(r.dosesPerVial, c.doses);
  });
}

test("mcg→mg conversion", () => {
  approx(mcgToMg(250), 0.25);
  approx(mcgToMg(1000), 1);
});

test("rejects non-positive inputs", () => {
  const r = computeRecon({ vialStrengthMg: 0, bacWaterMl: 1, desiredDoseMg: 1 });
  assert.equal(r.valid, false);
  assert.ok(r.errors.length > 0);
});

test("flags a dose that exceeds one syringe", () => {
  // 5 mg in 1 mL = 5 mg/mL; a 6 mg dose needs 1.2 mL > 1 mL barrel.
  const r = computeRecon({
    vialStrengthMg: 5,
    bacWaterMl: 1,
    desiredDoseMg: 6,
  });
  assert.equal(r.exceedsSyringe, true);
});

test("U-40 syringe changes the units factor, not the volume", () => {
  const base = { vialStrengthMg: 10, bacWaterMl: 1, desiredDoseMg: 0.5 };
  const u100 = computeRecon({ ...base, syringe: "U-100" });
  const u40 = computeRecon({ ...base, syringe: "U-40" });
  approx(u100.doseVolumeMl, u40.doseVolumeMl);
  approx(u40.unitsOnSyringe, u100.doseVolumeMl * 40);
});
