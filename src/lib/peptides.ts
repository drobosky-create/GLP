/**
 * peptides.ts — the peptide CATALOG, single source of truth for compounds (PRD §8.1).
 *
 * This is DATA, not logic. Adding a compound = adding one object to COMPOUNDS; it
 * never touches pk.ts or any screen. The schema is FROZEN so the catalog grows by
 * data entry, not refactor.
 *
 * Neutrality (§1.5): factual reference fields only — half-life, route, storage.
 * There is deliberately NO typicalDose / recommended-dose field. The user always
 * enters their own dose; the app never ships a dosing recommendation.
 *
 * Clinical values come from the Reference Sheet (§1). Only the first three carry
 * session-verified half-lives; the rest are scaffolded with verified:false and MUST
 * be checked before their §1 curve (pk.ts) is trusted — render those with a visible
 * "estimated, low-confidence" label.
 */

export type Confidence = "high" | "medium" | "low";

export interface Compound {
  id: string; // stable slug, e.g. "semaglutide"
  displayName: string; // "Semaglutide"
  brandNames?: string[]; // ["Ozempic", "Wegovy"]
  classLabel: string; // "GLP-1" | "GLP-1/GIP" | "GH secretagogue" | ...
  mode: "prescribed" | "compounded" | "both";
  route: "subcutaneous" | "oral" | "other";
  halfLifeHours: number; // drives the §1 curve math in pk.ts
  doseUnit: "mg" | "mcg" | "units";
  storage?: string; // short, factual: "Refrigerate 2–8°C"
  source: string; // provenance of halfLifeHours
  confidence: Confidence; // how solid that number is
  verified: boolean; // false = needs [VERIFY] before relying on the curve
  notes?: string;
}

export const COMPOUNDS: Compound[] = [
  {
    id: "semaglutide",
    displayName: "Semaglutide",
    brandNames: ["Ozempic", "Wegovy"],
    classLabel: "GLP-1",
    mode: "both",
    route: "subcutaneous",
    halfLifeHours: 168,
    doseUnit: "mg",
    source: "Reference Sheet §1 (peer-reviewed)",
    confidence: "high",
    verified: true,
  },

  {
    id: "tirzepatide",
    displayName: "Tirzepatide",
    brandNames: ["Mounjaro", "Zepbound"],
    classLabel: "GLP-1/GIP",
    mode: "both",
    route: "subcutaneous",
    halfLifeHours: 120,
    doseUnit: "mg",
    source: "Reference Sheet §1 (peer-reviewed/PMC)",
    confidence: "high",
    verified: true,
  },

  {
    id: "retatrutide",
    displayName: "Retatrutide",
    classLabel: "GLP-1/GIP/glucagon",
    mode: "compounded",
    route: "subcutaneous",
    halfLifeHours: 144,
    doseUnit: "mg",
    source: "Reference Sheet §1 (trial; investigational)",
    confidence: "medium",
    verified: true,
  },

  // --- scaffold: verify halfLifeHours before exposing the curve ---
  {
    id: "semaglutide-oral",
    displayName: "Semaglutide (oral)",
    brandNames: ["Rybelsus"],
    classLabel: "GLP-1",
    mode: "prescribed",
    route: "oral",
    halfLifeHours: 168,
    doseUnit: "mg",
    source: "[VERIFY] same molecule, oral route",
    confidence: "medium",
    verified: false,
  },

  {
    id: "liraglutide",
    displayName: "Liraglutide",
    brandNames: ["Saxenda", "Victoza"],
    classLabel: "GLP-1",
    mode: "prescribed",
    route: "subcutaneous",
    halfLifeHours: 13,
    doseUnit: "mg",
    source: "[VERIFY]",
    confidence: "low",
    verified: false,
  },

  // --- research peptides (PRD §8.1 "Growing it") — compounded only, almost all
  // community-sourced. halfLifeHours are [VERIFY] placeholders, confidence "low",
  // verified:false, so the §1 curve renders "estimated, low-confidence" for them.
  // Factual reference fields only; no typicalDose (neutrality §1.5). These surface
  // only in compounded mode, which is itself flag-gated pending legal review (§9).
  {
    id: "bpc-157",
    displayName: "BPC-157",
    classLabel: "Healing peptide",
    mode: "compounded",
    route: "subcutaneous",
    halfLifeHours: 4,
    doseUnit: "mcg",
    storage: "Refrigerate 2–8°C after reconstitution",
    source: "[VERIFY] community-reported; not clinically established",
    confidence: "low",
    verified: false,
  },
  {
    id: "tb-500",
    displayName: "TB-500",
    brandNames: ["Thymosin β4 fragment"],
    classLabel: "Healing peptide",
    mode: "compounded",
    route: "subcutaneous",
    halfLifeHours: 2,
    doseUnit: "mcg",
    storage: "Refrigerate 2–8°C after reconstitution",
    source: "[VERIFY] community-reported; not clinically established",
    confidence: "low",
    verified: false,
  },
  {
    id: "ipamorelin",
    displayName: "Ipamorelin",
    classLabel: "GH secretagogue",
    mode: "compounded",
    route: "subcutaneous",
    halfLifeHours: 2,
    doseUnit: "mcg",
    storage: "Refrigerate 2–8°C after reconstitution",
    source: "[VERIFY] community-reported",
    confidence: "low",
    verified: false,
  },
  {
    id: "cjc-1295",
    displayName: "CJC-1295 (no DAC)",
    brandNames: ["Mod GRF 1-29"],
    classLabel: "GH secretagogue",
    mode: "compounded",
    route: "subcutaneous",
    halfLifeHours: 0.5,
    doseUnit: "mcg",
    storage: "Refrigerate 2–8°C after reconstitution",
    source: "[VERIFY] community-reported",
    confidence: "low",
    verified: false,
  },
  {
    id: "cjc-1295-dac",
    displayName: "CJC-1295 (with DAC)",
    classLabel: "GH secretagogue",
    mode: "compounded",
    route: "subcutaneous",
    halfLifeHours: 144,
    doseUnit: "mcg",
    storage: "Refrigerate 2–8°C after reconstitution",
    source: "[VERIFY] community-reported; DAC extends half-life",
    confidence: "low",
    verified: false,
  },
  {
    id: "tesamorelin",
    displayName: "Tesamorelin",
    brandNames: ["Egrifta"],
    classLabel: "GHRH analog",
    mode: "compounded",
    route: "subcutaneous",
    halfLifeHours: 0.5,
    doseUnit: "mg",
    storage: "Refrigerate 2–8°C after reconstitution",
    source: "[VERIFY] approved elsewhere; PK not session-verified",
    confidence: "low",
    verified: false,
  },
  {
    id: "ghk-cu",
    displayName: "GHK-Cu",
    brandNames: ["Copper tripeptide-1"],
    classLabel: "Copper peptide",
    mode: "compounded",
    route: "other",
    halfLifeHours: 1,
    doseUnit: "mcg",
    storage: "Store per preparation guidance",
    source: "[VERIFY] community-reported",
    confidence: "low",
    verified: false,
  },
];

/** Convenience lookup by stable id. */
export function getCompound(id: string): Compound | undefined {
  return COMPOUNDS.find((c) => c.id === id);
}
