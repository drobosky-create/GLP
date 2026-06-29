// report.test.ts — verifies the correlation logic, neutrality of generated text,
// and the storage repo. Run: npx tsx tests/report.test.ts
import { buildReport, findDoseIncreases } from "../src/lib/report";
import { Repo, MemoryStorage } from "../src/lib/db";
import { DoseEvent, WeightEntry, SideEffectEntry } from "../src/types";

const DAY = 86_400_000;
const t0 = Date.UTC(2026, 0, 1);
const day = (n: number) => t0 + n * DAY;
let id = 0;
const nid = () => "t" + id++;

// Weekly semaglutide, escalating: 0.25 x4 wks, then 0.5 x4 wks (one increase at wk4)
const doses: DoseEvent[] = [];
for (let w = 0; w < 8; w++) {
  doses.push({ id: nid(), compoundId: "semaglutide", doseMg: w < 4 ? 0.25 : 0.5, at: day(w * 7) });
}

// Weight trending down 90 -> 86
const weights: WeightEntry[] = Array.from({ length: 8 }, (_, w) => ({
  id: nid(), at: day(w * 7), weightKg: 90 - w * 0.5,
}));

// Nausea: severe (3) 1 day after the increase (wk4 -> day 28), mild (1) elsewhere
const sideEffects: SideEffectEntry[] = [
  { id: nid(), at: day(2), type: "nausea", severity: 1 },
  { id: nid(), at: day(10), type: "nausea", severity: 1 },
  { id: nid(), at: day(29), type: "nausea", severity: 3 }, // 1 day after increase at day 28
  { id: nid(), at: day(30), type: "nausea", severity: 3 }, // 2 days after increase
  { id: nid(), at: day(50), type: "fatigue", severity: 2 },
];

let failures = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? "PASS  " : "FAIL  ") + name); if (!ok) failures++; };

const inc = findDoseIncreases(doses);
check("detects exactly one dose increase", inc.length === 1 && inc[0].fromMg === 0.25 && inc[0].toMg === 0.5);

const r = buildReport(doses, weights, sideEffects);
check("period spans ~8 weeks", r.weeks >= 7 && r.weeks <= 9);
check("counts 8 doses", r.doseCount === 8);
check("weight change is -3.5kg", r.weight.changeKg === -3.5);

const nausea = r.sideEffects.find((s) => s.type === "nausea")!;
check("nausea more severe near increase than baseline", (nausea.avgSeverityNearIncrease ?? 0) > (nausea.avgSeverityBaseline ?? 0));
check("nausea observation mentions dose increase timing", /after a dose increase/i.test(nausea.observation));

// Neutrality: no advisory language anywhere in generated text
const allText = [...r.summaryLines, ...r.sideEffects.map((s) => s.observation), r.disclaimer].join(" ").toLowerCase();
const banned = ["you should", "we recommend", "increase your", "decrease your", "stop taking", "take more", "take less", "i suggest"];
check("no advisory/recommending language", !banned.some((b) => allText.includes(b)));
check("includes not-medical-advice disclaimer", /not medical advice/i.test(r.disclaimer));

// Repo round-trip
(async () => {
  const repo = new Repo(new MemoryStorage());
  await repo.init();
  await repo.addDose({ compoundId: "tirzepatide", doseMg: 2.5, at: day(0) });
  await repo.addWeight({ at: day(0), weightKg: 88 });
  const repo2 = new Repo(new MemoryStorage());
  await repo2.init();
  check("repo persists a dose", repo.doses().length === 1 && repo.doses()[0].doseMg === 2.5);
  check("repo sorts + isolates instances", repo2.doses().length === 0);

  console.log("\nGENERATED SUMMARY (for eyeball / neutrality review):");
  r.summaryLines.forEach((l) => console.log("  • " + l));
  console.log("  • " + r.disclaimer);

  console.log(failures === 0 ? "\nALL REPORT/DB TESTS PASSED" : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})();
