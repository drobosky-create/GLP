// peptides.ts — the peptide CATALOG. Single source of truth for compounds (PRD §8.1).
//
// This file is DATA, not logic. Adding a compound = adding one object below.
// It must never import from pk.ts or any screen. pk.ts reads THIS.
//
// NEUTRALITY (PRD §1.5): factual reference fields only. There is intentionally
// NO dose/recommended-dose field — the user always enters their own dose.

export type Confidence = "high" | "medium" | "low";

export interface Compound {
  id: string;             // stable slug, e.g. "semaglutide"
  displayName: string;
  brandNames?: string[];
  classLabel: string;     // "GLP-1" | "GLP-1/GIP" | ...
  mode: "prescribed" | "compounded" | "both";
  route: "subcutaneous" | "oral" | "other";
  halfLifeHours: number;  // drives the curve math in pk.ts
  doseUnit: "mg" | "mcg" | "units";
  storage?: string;
  source: string;         // provenance of halfLifeHours
  confidence: Confidence;
  verified: boolean;      // false => curve must render with a low-confidence label
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
    halfLifeHours: 168, // ~7 days
    doseUnit: "mg",
    storage: "Refrigerate 2–8°C; protect from light",
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
    halfLifeHours: 120, // ~5 days
    doseUnit: "mg",
    storage: "Refrigerate 2–8°C",
    source: "Reference Sheet §1 (peer-reviewed / PMC)",
    confidence: "high",
    verified: true,
  },
  {
    id: "retatrutide",
    displayName: "Retatrutide",
    classLabel: "GLP-1/GIP/glucagon",
    mode: "compounded",
    route: "subcutaneous",
    halfLifeHours: 144, // ~6 days
    doseUnit: "mg",
    source: "Reference Sheet §1 (trial; investigational)",
    confidence: "medium",
    verified: true,
  },

  // --- scaffold: verify halfLifeHours before trusting the curve ---
  {
    id: "semaglutide-oral",
    displayName: "Semaglutide (oral)",
    brandNames: ["Rybelsus"],
    classLabel: "GLP-1",
    mode: "prescribed",
    route: "oral",
    halfLifeHours: 168, // same molecule; confirm route effects
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

  // --- research peptides (PRD §8.1 "Growing it") — compounded only, community-
  // sourced. halfLifeHours are [VERIFY] placeholders; verified:false => the curve
  // renders "estimated, low-confidence". Data only; no logic branches on these.
  { id: "bpc-157", displayName: "BPC-157", classLabel: "Healing peptide", mode: "compounded", route: "subcutaneous", halfLifeHours: 4, doseUnit: "mcg", storage: "Refrigerate 2–8°C after reconstitution", source: "[VERIFY] community-reported; not clinically established", confidence: "low", verified: false },
  { id: "tb-500", displayName: "TB-500", brandNames: ["Thymosin β4 fragment"], classLabel: "Healing peptide", mode: "compounded", route: "subcutaneous", halfLifeHours: 2, doseUnit: "mcg", storage: "Refrigerate 2–8°C after reconstitution", source: "[VERIFY] community-reported; not clinically established", confidence: "low", verified: false },
  { id: "ipamorelin", displayName: "Ipamorelin", classLabel: "GH secretagogue", mode: "compounded", route: "subcutaneous", halfLifeHours: 2, doseUnit: "mcg", storage: "Refrigerate 2–8°C after reconstitution", source: "[VERIFY] community-reported", confidence: "low", verified: false },
  { id: "cjc-1295", displayName: "CJC-1295 (no DAC)", brandNames: ["Mod GRF 1-29"], classLabel: "GH secretagogue", mode: "compounded", route: "subcutaneous", halfLifeHours: 0.5, doseUnit: "mcg", storage: "Refrigerate 2–8°C after reconstitution", source: "[VERIFY] community-reported", confidence: "low", verified: false },
  { id: "cjc-1295-dac", displayName: "CJC-1295 (with DAC)", classLabel: "GH secretagogue", mode: "compounded", route: "subcutaneous", halfLifeHours: 144, doseUnit: "mcg", storage: "Refrigerate 2–8°C after reconstitution", source: "[VERIFY] community-reported; DAC extends half-life", confidence: "low", verified: false },
  { id: "tesamorelin", displayName: "Tesamorelin", brandNames: ["Egrifta"], classLabel: "GHRH analog", mode: "compounded", route: "subcutaneous", halfLifeHours: 0.5, doseUnit: "mg", storage: "Refrigerate 2–8°C after reconstitution", source: "[VERIFY] approved elsewhere; PK not session-verified", confidence: "low", verified: false },
  { id: "ghk-cu", displayName: "GHK-Cu", brandNames: ["Copper tripeptide-1"], classLabel: "Copper peptide", mode: "compounded", route: "other", halfLifeHours: 1, doseUnit: "mcg", storage: "Store per preparation guidance", source: "[VERIFY] community-reported", confidence: "low", verified: false },
];

export const compoundById = (id: string): Compound | undefined =>
  COMPOUNDS.find((c) => c.id === id);

export const compoundsForMode = (mode: "prescribed" | "compounded"): Compound[] =>
  COMPOUNDS.filter((c) => c.mode === mode || c.mode === "both");
