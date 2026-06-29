// report.ts — the Correlation Report (PRD §4.1), the paid hero feature.
//
// Builds the data model for the doctor-shareable report: dose timeline, weight
// trend, and side-effect timing relative to dose INCREASES. Pure functions only —
// no DB, no DOM, no PDF here (the PDF renderer is a thin consumer of ReportModel).
//
// NEUTRALITY (PRD §1.1, §5, §9): every generated sentence DESCRIBES the user's own
// logged data. It never recommends a dose, substance, or change, and never says
// "you should". Phrasing is pattern-observation only, attributed to the user's logs.

import { DoseEvent, WeightEntry, SideEffectEntry, SideEffectType } from "../types";

const DAY = 86_400_000;

export interface DoseIncrease { at: number; fromMg: number; toMg: number; }

export interface SideEffectTiming {
  type: SideEffectType;
  count: number;
  /** avg severity in the 0–2 days after a dose increase */
  avgSeverityNearIncrease: number | null;
  /** avg severity at all other times */
  avgSeverityBaseline: number | null;
  /** plain, non-advisory observation */
  observation: string;
}

export interface ReportModel {
  periodStart: number;
  periodEnd: number;
  weeks: number;
  doseCount: number;
  doseIncreases: DoseIncrease[];
  weight: {
    startKg: number | null;
    endKg: number | null;
    changeKg: number | null;
    points: { at: number; kg: number }[];
  };
  sideEffects: SideEffectTiming[];
  summaryLines: string[];
  disclaimer: string;
}

const DISCLAIMER =
  "This report summarizes data you logged. It is informational and is not medical advice. " +
  "Discuss any changes with your healthcare provider.";

const avg = (xs: number[]): number | null =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Detect increases in dose for a single compound over time. */
export function findDoseIncreases(doses: DoseEvent[]): DoseIncrease[] {
  const sorted = [...doses].sort((a, b) => a.at - b.at);
  const out: DoseIncrease[] = [];
  let prev: number | null = null;
  for (const d of sorted) {
    if (prev !== null && d.doseMg > prev) out.push({ at: d.at, fromMg: prev, toMg: d.doseMg });
    prev = d.doseMg;
  }
  return out;
}

function nearAnyIncrease(at: number, increases: DoseIncrease[], windowDays = 2): boolean {
  return increases.some((inc) => at >= inc.at && at <= inc.at + windowDays * DAY);
}

function timingFor(
  type: SideEffectType,
  entries: SideEffectEntry[],
  increases: DoseIncrease[],
): SideEffectTiming {
  const ofType = entries.filter((e) => e.type === type);
  const near = avg(ofType.filter((e) => nearAnyIncrease(e.at, increases)).map((e) => e.severity));
  const base = avg(ofType.filter((e) => !nearAnyIncrease(e.at, increases)).map((e) => e.severity));

  let observation: string;
  const label = type.replace(/_/g, " ");
  if (near !== null && base !== null && near > base + 0.5) {
    observation = `Logged ${label} tended to be more severe in the 1–2 days after a dose increase (avg ${round1(near)} vs ${round1(base)} otherwise).`;
  } else if (near !== null && base !== null) {
    observation = `Logged ${label} severity was similar after dose increases and at other times (avg ${round1(near)} vs ${round1(base)}).`;
  } else {
    observation = `Logged ${label} on ${ofType.length} occasion(s); not enough spread to compare timing.`;
  }
  return { type, count: ofType.length, avgSeverityNearIncrease: near, avgSeverityBaseline: base, observation };
}

export function buildReport(
  doses: DoseEvent[],
  weights: WeightEntry[],
  sideEffects: SideEffectEntry[],
): ReportModel {
  const allTimes = [...doses, ...weights, ...sideEffects].map((x) => x.at);
  const periodStart = allTimes.length ? Math.min(...allTimes) : Date.now();
  const periodEnd = allTimes.length ? Math.max(...allTimes) : Date.now();
  const weeks = Math.max(1, Math.round((periodEnd - periodStart) / (7 * DAY)));

  const increases = findDoseIncreases(doses);

  const wSorted = [...weights].sort((a, b) => a.at - b.at);
  const startKg = wSorted.length ? wSorted[0].weightKg : null;
  const endKg = wSorted.length ? wSorted[wSorted.length - 1].weightKg : null;
  const changeKg = startKg !== null && endKg !== null ? round1(endKg - startKg) : null;

  const presentTypes = Array.from(new Set(sideEffects.map((e) => e.type)));
  const seTimings = presentTypes.map((t) => timingFor(t, sideEffects, increases));

  // --- neutral, descriptive summary ---
  const summaryLines: string[] = [];
  summaryLines.push(`Period: about ${weeks} week(s), with ${doses.length} dose(s) logged.`);
  if (increases.length) {
    summaryLines.push(`${increases.length} dose increase(s) recorded.`);
  }
  if (startKg !== null && endKg !== null) {
    const dir = changeKg! < 0 ? "down" : changeKg! > 0 ? "up" : "unchanged";
    summaryLines.push(`Weight went from ${round1(startKg)} to ${round1(endKg)} kg (${dir} ${Math.abs(changeKg!)} kg over the period).`);
  }
  for (const t of seTimings) summaryLines.push(t.observation);

  return {
    periodStart, periodEnd, weeks,
    doseCount: doses.length,
    doseIncreases: increases,
    weight: { startKg, endKg, changeKg, points: wSorted.map((w) => ({ at: w.at, kg: w.weightKg })) },
    sideEffects: seTimings,
    summaryLines,
    disclaimer: DISCLAIMER,
  };
}
