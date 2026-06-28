/**
 * content.ts — educational reference content for the Learn screen (screen-local
 * data, like InjectionSite/sites.ts, so /lib stays frozen).
 *
 * NEUTRALITY (§1.5 / §5 / §9): EDUCATION ONLY. Articles summarize published research
 * and describe general information; they recommend NO substance, dose, combination,
 * or purchase, and every clinical-adjacent point refers the reader to their provider.
 *
 * SOURCING: claims are tied to real, named sources (links below). Figures are stated
 * as published ranges, not targets. This copy was assembled against public sources
 * but still needs professional clinical + legal sign-off before release (it stays
 * gated behind compounded mode until then).
 */

export const EDUCATION_REVIEW_STATUS =
  "Educational summaries of published research, with sources. Pending final clinical and legal review before release.";

export interface Source {
  label: string;
  url?: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  body: string[]; // paragraphs
  evidence: string; // honest one-line posture on evidence strength
  sources: Source[];
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
      "Whether to use any compound, and in what combination, is a decision for you and a qualified healthcare provider.",
    ],
    evidence: "Framing only — no clinical claim.",
    sources: [{ label: "Tally editorial neutrality policy (§1.5)" }],
  },
  {
    id: "what-stacking-means",
    title: "What “stacking” means",
    summary:
      "A plain-language description of the term and the limits of the evidence.",
    body: [
      "“Stacking” refers to using more than one compound at once, often with the idea that the combination behaves differently than each compound alone.",
      "For many combinations discussed online, high-quality human evidence is limited or absent, and safety or interactions in combination are often not well characterized. As one example, a 2025 systematic review of BPC-157 for orthopaedic use found only a single human clinical study among hundreds screened.",
      "Because of that uncertainty, combinations are worth discussing with a provider who can consider your full medical picture. Tally does not evaluate or endorse any specific combination.",
    ],
    evidence: "Evidence for specific combinations is generally limited.",
    sources: [
      {
        label:
          "Vasireddi et al. Emerging Use of BPC-157 in Orthopaedic Sports Medicine: A Systematic Review. Am J Sports Med, 2025",
        url: "https://journals.sagepub.com/doi/abs/10.1177/15563316251355551",
      },
    ],
  },
  {
    id: "glp1-class-overview",
    title: "GLP-1 receptor agonists (overview)",
    summary:
      "What the medication class is, and what the major trials reported.",
    body: [
      "GLP-1 receptor agonists are prescription medications studied in large randomized trials. In STEP 1, once-weekly semaglutide led to roughly 15% mean body-weight reduction over 68 weeks (Wilding et al., NEJM 2021).",
      "Tirzepatide, a GLP-1/GIP agonist, produced up to about 21% mean reduction at its highest dose over 72 weeks in SURMOUNT-1 (Jastreboff et al., NEJM 2022). Retatrutide, an investigational GLP-1/GIP/glucagon agonist, showed up to about 24% at 48 weeks in a phase 2 trial (Jastreboff et al., NEJM 2023).",
      "These medications are prescribed and monitored by clinicians. Tally tracks what you log about your own use; it does not prescribe, dose, or recommend any medication.",
    ],
    evidence:
      "Large randomized trials for semaglutide and tirzepatide; retatrutide remains investigational.",
    sources: [
      {
        label: "Wilding et al. Once-Weekly Semaglutide… NEJM 2021 (STEP 1)",
        url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2032183",
      },
      {
        label:
          "Jastreboff et al. Tirzepatide Once Weekly for Obesity. NEJM 2022 (SURMOUNT-1)",
        url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2206038",
      },
      {
        label:
          "Jastreboff et al. Triple–Hormone-Receptor Agonist Retatrutide for Obesity. NEJM 2023",
        url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2301972",
      },
    ],
  },
  {
    id: "muscle-loss-on-glp1",
    title: "Muscle loss during weight loss",
    summary:
      "Why rapid weight loss — including on GLP-1 therapy — can include lean tissue.",
    body: [
      "Rapid weight loss generally comes partly from lean (muscle) tissue, not only fat. In the SURMOUNT-1 body-composition analysis, fat mass fell roughly three times more than lean mass — but lean mass still declined (Jastreboff et al., NEJM 2022).",
      "Clinical reviews and commentary estimate lean tissue can make up roughly a quarter to 40% of total weight lost during GLP-1 therapy, with higher concern for older adults and those with lower baseline muscle (Mass General Advances in Motion).",
      "This is the pattern Tally’s muscle module watches for in your own logged data, as a gentle, non-diagnostic prompt. It describes patterns; decisions belong with your provider.",
    ],
    evidence:
      "Consistent across trials and reviews; the exact lean-mass proportion varies.",
    sources: [
      {
        label:
          "Jastreboff et al. NEJM 2022 (SURMOUNT-1 body-composition results)",
        url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2206038",
      },
      {
        label:
          "Preserving Lean Body Mass in Patients Taking GLP-1. Mass General Advances in Motion",
        url: "https://advances.massgeneral.org/endocrinology/article.aspx?id=1601",
      },
    ],
  },
  {
    id: "protein-and-resistance-training",
    title: "Protein and resistance training",
    summary:
      "The two levers most studied for protecting muscle during weight loss.",
    body: [
      "Two levers are repeatedly studied for protecting muscle during weight loss: adequate protein intake and resistance training. A systematic review and meta-analysis found that higher protein intake helps maintain muscle mass, strength, and physical function in adults with overweight or obesity (Clinical Nutrition ESPEN, 2024).",
      "Resistance training is likewise described as a key strategy for higher-quality weight loss (preserving lean mass) in recent reviews. Commonly studied protein ranges sit around 1.2–1.6 g/kg/day, with resistance training often studied around three sessions per week.",
      "These are general published ranges, not a prescription — your provider may set different targets. Tally reflects your logged protein and strength data and recommends no specific plan.",
    ],
    evidence:
      "Supported by meta-analysis and reviews; the figures are general ranges, not targets.",
    sources: [
      {
        label:
          "Enhanced protein intake on maintaining muscle mass… systematic review & meta-analysis. Clinical Nutrition ESPEN, 2024",
        url: "https://www.clinicalnutritionespen.com/article/S2405-4577(24)00176-1/abstract",
      },
      {
        label:
          "Resistance training as a key strategy for high-quality weight loss. PMC, 2025",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12851882/",
      },
    ],
  },
  {
    id: "research-peptides-caution",
    title: "Research peptides: evidence and caution",
    summary:
      "Why many peptides in the catalog are labeled low-confidence / estimated.",
    body: [
      "Many peptides discussed in fitness and longevity communities — for example BPC-157 — are not approved medications for those uses and rest largely on preclinical (animal) data. A 2025 systematic review screened 544 studies of BPC-157 for orthopaedic use and found only one human clinical study; the rest were animal models, and the authors urged caution and called it investigational (Vasireddi et al., Am J Sports Med 2025).",
      "That is why Tally marks these compounds as low-confidence and shows their level curves as “estimated” — the half-life values are placeholders pending verification, not established figures.",
      "Sourcing, purity, legality, and safety of such compounds vary widely and are important to raise with a qualified provider. Tally provides reference information only and recommends nothing.",
    ],
    evidence:
      "Largely preclinical or community-reported; human evidence remains inadequate.",
    sources: [
      {
        label:
          "Vasireddi et al. BPC-157 in Orthopaedic Sports Medicine: A Systematic Review. Am J Sports Med, 2025",
        url: "https://journals.sagepub.com/doi/abs/10.1177/15563316251355551",
      },
      {
        label:
          "Regeneration or Risk? A Narrative Review of BPC-157 for Musculoskeletal Healing. PMC, 2025",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12446177/",
      },
    ],
  },
];
