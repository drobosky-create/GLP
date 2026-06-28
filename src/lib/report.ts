/**
 * report.ts — Correlation Report data assembly + PDF (the paid hero, PRD §4.1).
 * Maps side-effect severity & weight trend against the dose-escalation timeline.
 *
 * Two consumers share ONE geometry source (layoutChart): the on-screen SVG
 * (components/ReportChart) and the PDF here — so the export always matches what the
 * user saw. PDF colors are read from the theme.css tokens at runtime, so §13 stays
 * the single source of truth (no hex literals live in this file).
 *
 * Report language is strictly neutral (Ref §5): every summary line describes a
 * pattern in the user's OWN logged data ("Based on your logs…"), attributes nothing
 * to the app's judgment, and never recommends a dose, substance, or change.
 */

import type { DoseEvent, SideEffectEntry, WeightEntry } from "../types";

const DAY_MS = 86_400_000;

export interface DosePoint {
  t: number;
  dose: number;
  unit: string;
}
export interface WeightPoint {
  t: number;
  weightKg: number;
}
export interface EffectPoint {
  t: number;
  severity: number;
  type: string;
}

export interface ReportModel {
  hasData: boolean;
  startT: number;
  endT: number;
  doses: DosePoint[];
  weights: WeightPoint[];
  effects: EffectPoint[];
  doseMax: number;
  weightMin: number;
  weightMax: number;
  summary: string[];
  generatedAtLabel: string;
}

export interface ReportInput {
  doseEvents: DoseEvent[];
  weightEntries: WeightEntry[];
  sideEffects: SideEffectEntry[];
}

function fmtDate(t: number): string {
  return new Date(t).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Neutral, data-descriptive summary lines (Ref §5). */
function buildSummary(
  doses: DosePoint[],
  weights: WeightPoint[],
  effects: EffectPoint[],
): string[] {
  const lines: string[] = [];
  if (doses.length === 0 && weights.length === 0 && effects.length === 0) {
    return [
      "Start logging doses, weight, and side effects to generate your report.",
    ];
  }

  const allT = [
    ...doses.map((d) => d.t),
    ...weights.map((w) => w.t),
    ...effects.map((e) => e.t),
  ];
  const startT = Math.min(...allT);
  const endT = Math.max(...allT);
  lines.push(`Based on your logs from ${fmtDate(startT)} to ${fmtDate(endT)}.`);

  // Dose timeline + titration count.
  const increases: number[] = [];
  let prev: number | null = null;
  for (const d of doses) {
    if (prev != null && d.dose > prev) increases.push(d.t);
    prev = d.dose;
  }
  if (doses.length > 0) {
    lines.push(
      `You logged ${doses.length} dose${doses.length === 1 ? "" : "s"}, with ${
        increases.length
      } dose increase${increases.length === 1 ? "" : "s"} during this period.`,
    );
  }

  // Side-effect timing relative to dose increases (pattern, not advice).
  if (increases.length > 0 && effects.length > 0) {
    const byDay = new Map<number, number[]>();
    for (const e of effects) {
      let near: number | null = null;
      for (const it of increases) {
        if (it <= e.t) near = it;
        else break;
      }
      if (near == null) continue;
      const day = Math.floor((e.t - near) / DAY_MS);
      if (day < 0 || day > 7) continue;
      const bucket = byDay.get(day) ?? [];
      bucket.push(e.severity);
      byDay.set(day, bucket);
    }
    const total = [...byDay.values()].reduce((n, a) => n + a.length, 0);
    if (total >= 3) {
      const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
      let peakDay = 0;
      let peakAvg = -1;
      for (const [day, sev] of byDay) {
        const m = avg(sev);
        if (m > peakAvg) {
          peakAvg = m;
          peakDay = day;
        }
      }
      let resolveDay: number | null = null;
      for (let day = peakDay + 1; day <= 7; day++) {
        const sev = byDay.get(day);
        if (sev && avg(sev) <= peakAvg * 0.5) {
          resolveDay = day;
          break;
        }
      }
      lines.push(
        `Across your dose increases, logged side-effect severity tended to peak around day ${peakDay}` +
          (resolveDay != null ? ` and ease by day ${resolveDay}.` : "."),
      );
    }
  }

  // Most frequently logged side effect.
  if (effects.length > 0) {
    const counts = new Map<string, number>();
    for (const e of effects)
      counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    let topType = "";
    let topN = 0;
    for (const [type, n] of counts)
      if (n > topN) {
        topN = n;
        topType = type;
      }
    lines.push(
      `Your most frequently logged side effect was ${topType} (${topN} entr${
        topN === 1 ? "y" : "ies"
      }).`,
    );
  }

  // Weight change over the period (description only).
  if (weights.length >= 2) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const delta = round1(last.weightKg - first.weightKg);
    const dir = delta < 0 ? "down" : delta > 0 ? "up" : "unchanged";
    lines.push(
      delta === 0
        ? `Your logged weight was unchanged at ${first.weightKg} kg.`
        : `Your logged weight went from ${first.weightKg} kg to ${last.weightKg} kg (${dir} ${Math.abs(
            delta,
          )} kg).`,
    );
  }

  return lines;
}

export function buildReport(input: ReportInput): ReportModel {
  const doses: DosePoint[] = input.doseEvents
    .map((d) => ({ t: Date.parse(d.datetime), dose: d.dose, unit: d.doseUnit }))
    .sort((a, b) => a.t - b.t);
  const weights: WeightPoint[] = input.weightEntries
    .map((w) => ({ t: Date.parse(w.datetime), weightKg: w.weightKg }))
    .sort((a, b) => a.t - b.t);
  const effects: EffectPoint[] = input.sideEffects
    .map((e) => ({ t: Date.parse(e.datetime), severity: e.severity, type: e.type }))
    .sort((a, b) => a.t - b.t);

  const allT = [
    ...doses.map((d) => d.t),
    ...weights.map((w) => w.t),
    ...effects.map((e) => e.t),
  ];
  const hasData = allT.length > 0;
  const startT = hasData ? Math.min(...allT) : 0;
  const endT = hasData ? Math.max(...allT) : 0;
  const doseMax = Math.max(1, ...doses.map((d) => d.dose));
  const weightVals = weights.map((w) => w.weightKg);
  const weightMin = weightVals.length ? Math.min(...weightVals) : 0;
  const weightMax = weightVals.length ? Math.max(...weightVals) : 0;

  return {
    hasData,
    startT,
    endT,
    doses,
    weights,
    effects,
    doseMax,
    weightMin,
    weightMax,
    summary: buildSummary(doses, weights, effects),
    generatedAtLabel: fmtDate(Date.now()),
  };
}

// ---- Shared chart geometry (consumed by SVG + PDF) ----

export interface XY {
  x: number;
  y: number;
}
export interface ChartLayout {
  width: number;
  height: number;
  plot: { x: number; y: number; w: number; h: number };
  doseStep: XY[];
  weightLine: XY[];
  effects: { x: number; y: number; r: number; severity: number }[];
  xTicks: { x: number; label: string }[];
  doseTicks: { y: number; label: string }[];
  weightTicks: { y: number; label: string }[];
}

/** Pure layout: maps a ReportModel into pixel coordinates for a given canvas. */
export function layoutChart(
  m: ReportModel,
  width: number,
  height: number,
): ChartLayout {
  const pad = { l: 38, r: 44, t: 18, b: 26 };
  const plot = {
    x: pad.l,
    y: pad.t,
    w: Math.max(1, width - pad.l - pad.r),
    h: Math.max(1, height - pad.t - pad.b),
  };
  const span = Math.max(1, m.endT - m.startT);
  const sx = (t: number) => plot.x + ((t - m.startT) / span) * plot.w;
  const syDose = (d: number) => plot.y + plot.h - (d / m.doseMax) * plot.h;
  const wSpan = Math.max(1e-9, m.weightMax - m.weightMin);
  const syWeight = (w: number) =>
    plot.y + plot.h - ((w - m.weightMin) / wSpan) * plot.h;

  // Dose as a step-after line, extended to the end of the range.
  const doseStep: XY[] = [];
  m.doses.forEach((d, i) => {
    const x = sx(d.t);
    const y = syDose(d.dose);
    if (i === 0) {
      doseStep.push({ x, y });
    } else {
      doseStep.push({ x, y: doseStep[doseStep.length - 1].y });
      doseStep.push({ x, y });
    }
  });
  if (doseStep.length > 0) {
    doseStep.push({ x: sx(m.endT), y: doseStep[doseStep.length - 1].y });
  }

  const weightLine: XY[] = m.weights.map((w) => ({
    x: sx(w.t),
    y: syWeight(w.weightKg),
  }));

  // Effects: markers along the top band; radius encodes severity (Ref §4.1 heat).
  const effects = m.effects.map((e) => ({
    x: sx(e.t),
    y: plot.y + 8,
    r: 2 + (e.severity / 10) * 5,
    severity: e.severity,
  }));

  // A few ticks for readability.
  const xTicks = m.hasData
    ? [0, 0.5, 1].map((f) => ({
        x: plot.x + f * plot.w,
        label: fmtDate(m.startT + f * span),
      }))
    : [];
  const doseTicks = [0, 1].map((f) => ({
    y: plot.y + plot.h - f * plot.h,
    label: `${round1(f * m.doseMax)}`,
  }));
  const weightTicks =
    m.weights.length > 0
      ? [0, 1].map((f) => ({
          y: plot.y + plot.h - f * plot.h,
          label: `${round1(m.weightMin + f * wSpan)}`,
        }))
      : [];

  return {
    width,
    height,
    plot,
    doseStep,
    weightLine,
    effects,
    xTicks,
    doseTicks,
    weightTicks,
  };
}

// ---- PDF export ----

// Reads a color from the theme.css tokens at runtime (PDF runs in the browser on a
// user tap, so the document is always present). Keeps theme.css the single source
// of color truth — no hex literals live in this module (§13).
function token(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Generate the one-page doctor report as a PDF Blob. jsPDF is lazy-loaded so it
 * never weighs down the main bundle. Colors come from theme tokens (§13).
 */
export async function generateReportPdf(m: ReportModel): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const contentW = pageW - marginX * 2;

  const cText = token("--color-text");
  const cMuted = token("--color-muted");
  const cBorder = token("--color-border");
  const cDose = token("--color-accent");
  const cWeight = token("--color-accent-alt");
  const cEffect = token("--color-danger");

  let y = 54;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(cText);
  doc.text("Tally — Progress Report", marginX, y);

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(cMuted);
  doc.text(`Generated ${m.generatedAtLabel}`, marginX, y);

  // Summary block.
  y += 24;
  doc.setFontSize(11);
  doc.setTextColor(cText);
  for (const line of m.summary) {
    const wrapped = doc.splitTextToSize(line, contentW) as string[];
    for (const w of wrapped) {
      doc.text(`• ${w}`, marginX, y);
      y += 15;
    }
  }

  // Chart.
  y += 10;
  const chartH = 220;
  const layout = layoutChart(m, contentW, chartH);
  const ox = marginX;
  const oy = y;

  // Plot frame.
  doc.setDrawColor(cBorder);
  doc.setLineWidth(0.75);
  doc.rect(ox + layout.plot.x, oy + layout.plot.y, layout.plot.w, layout.plot.h);

  // Axis tick labels.
  doc.setFontSize(7);
  doc.setTextColor(cMuted);
  for (const t of layout.xTicks)
    doc.text(t.label, ox + t.x, oy + layout.plot.y + layout.plot.h + 12, {
      align: "center",
    });
  for (const t of layout.doseTicks)
    doc.text(t.label, ox + layout.plot.x - 4, oy + t.y + 3, { align: "right" });

  // Dose step line.
  doc.setDrawColor(cDose);
  doc.setLineWidth(1.4);
  for (let i = 1; i < layout.doseStep.length; i++) {
    const a = layout.doseStep[i - 1];
    const b = layout.doseStep[i];
    doc.line(ox + a.x, oy + a.y, ox + b.x, oy + b.y);
  }

  // Weight line.
  doc.setDrawColor(cWeight);
  doc.setLineWidth(1.4);
  for (let i = 1; i < layout.weightLine.length; i++) {
    const a = layout.weightLine[i - 1];
    const b = layout.weightLine[i];
    doc.line(ox + a.x, oy + a.y, ox + b.x, oy + b.y);
  }

  // Effect markers.
  doc.setFillColor(cEffect);
  for (const e of layout.effects) {
    doc.circle(ox + e.x, oy + e.y, e.r, "F");
  }

  y = oy + chartH + 18;

  // Legend.
  doc.setFontSize(8);
  doc.setTextColor(cMuted);
  doc.text(
    "Dose level (step) · Weight (line) · Side effect (marker; larger = higher severity)",
    marginX,
    y,
  );

  // Neutral disclaimer footer (Ref §5 / PRD §9).
  y += 22;
  doc.setFontSize(8);
  doc.setTextColor(cMuted);
  const disclaimer =
    "This report describes patterns in your own logged data. It is not medical advice and makes no dosing or treatment recommendation. Discuss any changes with your provider.";
  for (const w of doc.splitTextToSize(disclaimer, contentW) as string[]) {
    doc.text(w, marginX, y);
    y += 12;
  }

  return doc.output("blob");
}
