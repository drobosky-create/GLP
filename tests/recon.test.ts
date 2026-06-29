// recon.test.ts — known-good cases from Reference Sheet §2.2.
// Run: npx tsx tests/recon.test.ts   (exits non-zero on any failure)
import { reconstitute, mcgToMg } from "../src/lib/recon";

interface Case {
  name: string;
  vialStrengthMg: number;
  bacWaterMl: number;
  desiredDoseMg: number;
  expectConcentration: number;
  expectVolumeMl: number;
  expectUnits: number;
  expectDosesPerVial: number;
}

const cases: Case[] = [
  { name: "5mg / 2mL / 250mcg", vialStrengthMg: 5, bacWaterMl: 2, desiredDoseMg: mcgToMg(250), expectConcentration: 2.5, expectVolumeMl: 0.10, expectUnits: 10, expectDosesPerVial: 20 },
  { name: "5mg / 1mL / 250mcg", vialStrengthMg: 5, bacWaterMl: 1, desiredDoseMg: mcgToMg(250), expectConcentration: 5, expectVolumeMl: 0.05, expectUnits: 5, expectDosesPerVial: 20 },
  { name: "10mg / 1mL / 0.5mg", vialStrengthMg: 10, bacWaterMl: 1, desiredDoseMg: 0.5, expectConcentration: 10, expectVolumeMl: 0.05, expectUnits: 5, expectDosesPerVial: 20 },
  { name: "10mg / 2mL / 2.5mg", vialStrengthMg: 10, bacWaterMl: 2, desiredDoseMg: 2.5, expectConcentration: 5, expectVolumeMl: 0.5, expectUnits: 50, expectDosesPerVial: 4 },
  { name: "15mg / 3mL / 5mg", vialStrengthMg: 15, bacWaterMl: 3, desiredDoseMg: 5, expectConcentration: 5, expectVolumeMl: 1.0, expectUnits: 100, expectDosesPerVial: 3 },
];

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

let failures = 0;
for (const c of cases) {
  const r = reconstitute({ vialStrengthMg: c.vialStrengthMg, bacWaterMl: c.bacWaterMl, desiredDoseMg: c.desiredDoseMg });
  const checks: [string, boolean][] = [
    ["concentration", approx(r.concentrationMgPerMl, c.expectConcentration)],
    ["volumeMl", approx(r.doseVolumeMl, c.expectVolumeMl)],
    ["units", approx(r.units, c.expectUnits)],
    ["dosesPerVial", approx(r.dosesPerVial, c.expectDosesPerVial)],
  ];
  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length) {
    failures++;
    console.log(`FAIL  ${c.name}: ${failed.map(([k]) => k).join(", ")}`, r);
  } else {
    console.log(`PASS  ${c.name}  ->  ${r.units} units, ${r.dosesPerVial} doses/vial`);
  }
}

// guardrails
try { reconstitute({ vialStrengthMg: 0, bacWaterMl: 2, desiredDoseMg: 0.25 }); console.log("FAIL  rejects-zero-input"); failures++; }
catch { console.log("PASS  rejects zero/negative input"); }

const big = reconstitute({ vialStrengthMg: 10, bacWaterMl: 1, desiredDoseMg: 2 }); // 2mg @ 10mg/mL = 0.2mL = 20u (fits)
const over = reconstitute({ vialStrengthMg: 5, bacWaterMl: 1, desiredDoseMg: 1.5 }); // 1.5mg @ 5mg/mL = 0.3mL = 30u (fits)
const tooBig = reconstitute({ vialStrengthMg: 2, bacWaterMl: 1, desiredDoseMg: 1.5 }); // 1.5mg @ 2mg/mL = 0.75mL = 75u (fits U-100)
const way = reconstitute({ vialStrengthMg: 2, bacWaterMl: 1, desiredDoseMg: 3 }); // 3mg @ 2mg/mL = 1.5mL = 150u (exceeds U-100)
console.log(way.exceedsSyringe ? "PASS  flags dose that exceeds one syringe" : "FAIL  exceedsSyringe");
if (!way.exceedsSyringe) failures++;

console.log(failures === 0 ? "\nALL RECON TESTS PASSED" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
