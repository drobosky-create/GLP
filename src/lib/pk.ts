/**
 * pk.ts — medication-level curve MATH only (model from Reference Sheet §1).
 * Reads compound half-lives from peptides.ts; it does NOT own catalog data.
 *
 * The curve is a RELATIVE-concentration visualization (single-compartment
 * exponential decay, superposition of weekly doses) — never a clinical plasma
 * reading, never used to advise dose timing or changes (Ref §1.3). Any compound
 * with verified:false must render with a visible "estimated, low-confidence" label.
 *
 * Phase 6 fills this in.
 */
export {};
