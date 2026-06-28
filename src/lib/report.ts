/**
 * report.ts — correlation report data assembly + client-side PDF generation
 * (the paid hero feature, PRD §4.1). Maps side-effect severity & weight trend
 * against the dose-escalation timeline and emits a clean one-page PDF.
 *
 * Report language is strictly neutral (Ref §5): describe patterns in the user's own
 * data ("Nausea peaked 1–2 days after each dose increase, resolved by day 4"),
 * attribute to "your logs", never prescribe a dose/substance/change, flags refer
 * outward ("worth discussing with your provider").
 *
 * Phase 3 fills this in (a PDF lib is added then, per the agreed dependency set).
 */
export {};
