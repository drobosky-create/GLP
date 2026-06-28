/**
 * content.ts — educational reference content for the Learn screen (screen-local
 * data, like InjectionSite/sites.ts, so /lib stays frozen).
 *
 * NEUTRALITY (§1.5 / §5 / §9): this is EDUCATION ONLY. Articles describe general,
 * publicly-discussed information; they recommend NO substance, dose, combination, or
 * purchase, and every clinical-adjacent point refers the reader to their provider.
 *
 * REVIEW STATUS: this seed copy is a DRAFT scaffold. It deliberately makes no
 * specific dosing or efficacy claims and cites source CATEGORIES rather than
 * fabricated references. It must be replaced by professionally written, properly
 * cited content and cleared by counsel before this surface is released (gated behind
 * compounded mode until then).
 */

export const EDUCATION_REVIEW_STATUS =
  "Draft content — pending clinical and legal review before release.";

export interface Article {
  id: string;
  title: string;
  summary: string;
  body: string[]; // paragraphs
  evidence: string; // honest one-line posture on evidence strength
  sources: string[]; // source categories, not fabricated citations
}

export const EDUCATION_ARTICLES: Article[] = [
  {
    id: "how-tally-thinks-about-stacks",
    title: "How Tally thinks about stacks",
    summary:
      "Why Tally describes, but never recommends, combinations of compounds.",
    body: [
      "A “stack” is simply more than one compound used over the same period. People in various communities combine compounds, but Tally is a neutral logging and reference tool — it does not recommend any substance, dose, or combination.",
      "Anywhere you see a stack in Tally, it is one you created yourself. The app reflects your own logged data back to you and nothing more.",
      "Decisions about whether to use any compound, and in what combination, belong between you and a qualified healthcare provider.",
    ],
    evidence: "Framing only — no clinical claim.",
    sources: ["Tally editorial policy (§1.5 neutrality)"],
  },
  {
    id: "what-stacking-means",
    title: "What “stacking” means",
    summary:
      "A plain-language description of the term and the limits of the evidence.",
    body: [
      "“Stacking” refers to using more than one compound at once, often with the idea that the combination behaves differently than each compound alone.",
      "For many combinations discussed online, high-quality clinical evidence in humans is limited or absent, and interactions or safety in combination are frequently not well characterized.",
      "Because of that uncertainty, combinations are worth discussing with a provider who can consider your full medical picture. Tally does not evaluate or endorse any specific combination.",
    ],
    evidence: "Evidence for specific combinations is generally limited.",
    sources: [
      "General clinical pharmacology principles",
      "Public health information on supplement/peptide use",
    ],
  },
  {
    id: "glp1-class-overview",
    title: "GLP-1 receptor agonists (overview)",
    summary:
      "A factual overview of the medication class many Tally users track.",
    body: [
      "GLP-1 receptor agonists are a class of medications prescribed by clinicians, commonly in the context of type 2 diabetes and weight management. Examples include semaglutide and tirzepatide (a GLP-1/GIP agonist).",
      "They are typically prescribed and monitored by a healthcare provider, who determines whether they are appropriate and how they are used.",
      "Tally tracks what you log about your own use; it does not prescribe, dose, or recommend any medication.",
    ],
    evidence: "Well-established prescription class; use is provider-directed.",
    sources: [
      "Manufacturer prescribing information",
      "Peer-reviewed clinical pharmacology reviews",
    ],
  },
  {
    id: "research-peptides-caution",
    title: "Research peptides: evidence and caution",
    summary:
      "Why many peptides in the catalog are labeled low-confidence / estimated.",
    body: [
      "Many peptides discussed in fitness and longevity communities — for example BPC-157, TB-500, and growth-hormone secretagogues — are not approved medications for those uses, and much of what circulates about them comes from preclinical (animal) studies or community reports rather than rigorous human trials.",
      "That is why Tally marks these compounds as low-confidence and shows their level curves as “estimated.” The half-life values are placeholders pending verification, not established figures.",
      "Sourcing, purity, legality, and safety of such compounds vary widely. These are important topics to raise with a qualified provider; Tally provides reference information only and recommends nothing.",
    ],
    evidence: "Largely preclinical or community-reported; not established in humans.",
    sources: [
      "Preclinical literature (animal studies)",
      "Regulatory status notices",
      "Community-reported information (unverified)",
    ],
  },
];
