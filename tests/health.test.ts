// health.test.ts — the pure dedupe used by Health sync (weight import).
// Run: npx tsx tests/health.test.ts   (exits non-zero on any failure)
import { newWeightSamples } from "../src/lib/health";

const HOUR = 3_600_000;
const t0 = Date.UTC(2026, 0, 1, 8, 0, 0);

let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log((ok ? "PASS  " : "FAIL  ") + name);
  if (!ok) failures++;
};

const existing = [
  { at: t0, weightKg: 80 },
  { at: t0 + 24 * HOUR, weightKg: 79.5 },
];

// Exact dup (same time + weight) is filtered out.
check(
  "filters an exact duplicate",
  newWeightSamples([{ at: t0, weightKg: 80 }], existing).length === 0,
);

// Same weight within the 1h tolerance counts as already present.
check(
  "filters a near-time duplicate (within tolerance)",
  newWeightSamples([{ at: t0 + 30 * 60 * 1000, weightKg: 80 }], existing).length === 0,
);

// Same time but a meaningfully different weight is kept.
check(
  "keeps a different weight at the same time",
  newWeightSamples([{ at: t0, weightKg: 82 }], existing).length === 1,
);

// A genuinely new reading (new day) is kept.
check(
  "keeps a new reading",
  newWeightSamples([{ at: t0 + 72 * HOUR, weightKg: 78 }], existing).length === 1,
);

// Outside the tolerance window, same weight is treated as new.
check(
  "keeps same weight outside the time tolerance",
  newWeightSamples([{ at: t0 + 3 * HOUR, weightKg: 80 }], existing).length === 1,
);

// Empty inputs.
check("no samples -> nothing", newWeightSamples([], existing).length === 0);
check(
  "no existing -> all kept",
  newWeightSamples([{ at: t0, weightKg: 80 }], []).length === 1,
);

console.log(failures === 0 ? "\nALL HEALTH TESTS PASSED" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
