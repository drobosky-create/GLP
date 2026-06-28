# GLP-1 Companion — Verified Reference Sheet

> **What this is:** The companion to the PRD. It resolves the five open verification items so Claude Code implements the clinical/technical features against checked values instead of guesses. Every number here has a source listed in §7.
>
> **Neutrality reminder (from PRD §1.5):** Everything below is implemented as **calculation and description of the user's own entered data**. The app never recommends a substance, a dose, or a change. Targets shown to users are presented as general published ranges with "discuss with your provider" framing — never as a personalized prescription.
>
> **Reliability note:** These constants are accurate as of mid-2026 but are not eternal. Re-verify PK values, protein guidance, and iOS capabilities before each major release.

---

## 1. Medication-level curve — PK constants & model

The "how much is in my system" feature is a **relative-concentration visualization**, not a measurement of actual plasma levels. Label it that way in-app. It models accumulation from weekly dosing using single-compartment exponential decay.

### 1.1 Verified half-lives

| Compound | Brand(s) | Elimination half-life | Time to steady state |
|---|---|---|---|
| Semaglutide | Ozempic, Wegovy | ~7 days (~168 h) | ~4–5 weeks |
| Tirzepatide | Mounjaro, Zepbound | ~5 days | ~4 weeks |
| Retatrutide | (investigational) | ~6 days | ~4–5 weeks |

Supporting parameters (tirzepatide, from peer-reviewed PMC source): Tmax 8–72 h, subcutaneous bioavailability ~80%, ~99% albumin-bound, accumulation ratio ~1.6× single dose at steady state. Semaglutide accumulation ~2× first dose to steady state (half-life ≈ dosing interval).

### 1.2 The math
- Decay constant: `k = ln(2) / half_life` (use consistent time units — hours recommended).
- Concentration contribution of a single dose at time *t* after injection: `C(t) = Dose × e^(−k·t)` (relative units; absorption phase can be ignored for a relative model, or approximated with Tmax).
- Total level at any time = **superposition** (sum) of all prior doses' decay curves. This produces the characteristic saw-tooth that plateaus at steady state.
- Steady state ≈ 4–5 half-lives of consistent dosing — surface this as "your levels are stabilizing around week X" based on the user's actual start date.

### 1.3 Guardrails
- Present as relative/illustrative, never as a clinical plasma reading.
- Do **not** use it to suggest dose timing or changes. It visualizes; it does not advise.
- Population PK shows no significant adjustment needed for age/weight/sex — so don't build pseudo-personalization that implies medical precision you don't have.

---

## 2. Reconstitution calculator — math & test suite (Compounded mode only)

Pure arithmetic, but a wrong unit count in a health context is the worst possible bug. Ship with the test cases below as automated tests; do not expose the feature until they pass. Display a persistent "calculator only — verify with your provider" notice.

### 2.1 Formulas
```
concentration_mg_per_mL = vial_strength_mg / bac_water_mL
dose_volume_mL          = desired_dose_mg / concentration_mg_per_mL
units_on_U100_syringe   = dose_volume_mL × 100      // U-100: 100 units = 1 mL
doses_per_vial          = vial_strength_mg / desired_dose_mg
```
Convert mcg→mg by dividing by 1000 before using the formulas (e.g., 250 mcg = 0.25 mg).

### 2.2 Known-good test cases
| Vial (mg) | BAC water (mL) | Desired dose | Concentration | Volume | **Units (U-100)** | Doses/vial |
|---|---|---|---|---|---|---|
| 5 | 2 | 250 mcg (0.25 mg) | 2.5 mg/mL | 0.10 mL | **10** | 20 |
| 5 | 1 | 250 mcg | 5 mg/mL | 0.05 mL | **5** | 20 |
| 10 | 1 | 0.5 mg | 10 mg/mL | 0.05 mL | **5** | 20 |
| 10 | 2 | 2.5 mg | 5 mg/mL | 0.50 mL | **50** | 4 |
| 15 | 3 | 5 mg | 5 mg/mL | 1.00 mL | **100** | 3 |

### 2.3 Guardrails
- Validate inputs: positive numbers, dose volume must not exceed syringe capacity (flag "dose exceeds one syringe" rather than silently rounding).
- Default syringe type to U-100; if you ever add U-40/U-50, the ×100 factor changes — make it a parameter, not a magic number.
- Round display sensibly (units to nearest 0.5 or whole, per syringe gradations) but compute on exact values.

---

## 3. Muscle-preservation module — thresholds & logic

This is the differentiator. The numbers below are general published ranges; present them as such, never as a personal prescription.

### 3.1 The facts that motivate the feature
- Roughly **20–40%** of weight lost on GLP-1 therapy can come from lean mass (some sources cite 25–40%); ~40% reported for semaglutide in a 2025 Endocrine Society study. This is largely common to rapid weight loss generally, not unique to the drug.
- Higher risk groups: **older adults, women, those eating less protein, and faster/sharper weight loss.**
- Protein intake + resistance training are the two evidence-backed levers; resistance training beats aerobic for muscle preservation.

### 3.2 Protein targets (published ranges — display as general guidance)
- Active weight-loss range commonly cited: **1.2–1.6 g/kg/day** (some clinicians go to ~2.0 g/kg).
- Joint clinical advisory (ACLM/ASN/OMA/TOS) guardrails: do **not** fall below 0.4–0.5 g/kg/day; avoid sustained intake ≥2.0 g/kg/day. Alternative absolute target: **80–120 g/day**. Most accurate basis is 1.5 g/kg of **lean/fat-free mass**, which needs body-composition data.
- **Implementation:** let the user pick the basis (body weight vs adjusted/ideal vs lean mass). Default to a conservative mid-range and label it "general guidance — your provider may set a different target." Using actual body weight for people with obesity overestimates needs — note this.

### 3.3 The "muscle-risk" flag (gentle, non-diagnostic)
Trigger a soft prompt when the user's **own logged data** shows the risk pattern — never a diagnosis, always provider-referral framing:
- Rate of weight loss is fast **and** protein has been below the user's chosen target over a rolling window, **or**
- Lean-mass estimate (if body-fat % is logged) is trending down faster than expected.

Suggested copy: *"Your weight has been dropping quickly and your protein has been under your target this week. Muscle protection is worth raising with your provider — protein and resistance training are the usual levers."* No numbers prescribed, no plan generated.

### 3.4 Guardrails
- Frame everything as "general published guidance," cite that it's not personalized.
- Never tell a user to change medication, dose, or eat a specific plan.
- This is a wellness/tracking nudge, not clinical decision support — keep it on the safe side of that line. **[Confirm framing with counsel, per PRD §9.]**

---

## 4. iOS notifications — the reality (this changes onboarding design)

**The finding that matters:** On iOS, web push works only on **iOS 16.4+ AND only after the user adds the PWA to their home screen via Safari.** A site open in a Safari tab or any in-app browser **cannot** send push. There is **no automatic install prompt** on iOS — the user must do it manually. Subscriptions can also silently "disappear," and there's no background sync. Android is mature and full-featured by comparison.

### 4.1 What this forces in the build
1. **A guided "Add to Home Screen" onboarding step is mandatory, not optional.** Detect iOS + not-installed, and walk the user through Share → Add to Home Screen with screenshots/arrows. This is the single biggest determinant of whether your core reminder feature works at all on iPhone.
2. **Permission prompt must fire on a user tap** (e.g., an "Enable reminders" button) from inside the installed PWA — not on page load.
3. **Build an email (and optional calendar) reminder fallback.** Because a meaningful share of iOS users won't install, and push can drop silently, dose/weigh-in reminders must have a non-push channel. A calendar-event export (you already have the calendar tooling pattern) is a clean fallback.
4. **Don't depend on background sync.** The app shows last-cached data on open; refresh on launch. iOS may also evict cached storage after long disuse — so treat IndexedDB as the working store but make export/backup easy.
5. **Route iOS taps into Safari.** If your install/marketing links open in an in-app browser, the Add-to-Home-Screen path is hidden or broken.

### 4.2 Reasonable expectations
- iOS opt-in rates run well below Android; plan for it.
- ~95%+ of iPhones are on iOS 16+, so the OS floor isn't the constraint — the install step is.

---

## 5. Report-language rules (neutrality-safe phrasing)

The doctor-report is the paid hero feature; its credibility depends on it reading as neutral data, not advice. Hard rules for any generated text:

- **Describe patterns, don't prescribe.** ✅ "Nausea peaked 1–2 days after each dose increase and resolved by day 4." ❌ "You should increase your dose more slowly."
- **Attribute to the user's data, not to the app's judgment.** "Based on your logs…" not "We recommend…".
- **No dose, substance, or brand recommendations. Ever.**
- **Flags refer the user outward:** "worth discussing with your provider," never "do X."
- **Targets are general ranges,** explicitly labeled as published guidance, not personalized.
- **No claims of medical accuracy** for the medication-level curve — "illustrative/relative."

---

## 6. Open items still requiring a human (not resolvable by research)

- [ ] **Legal review** of compounded-mode framing, the muscle-risk flag, and report language. (Research can't substitute for counsel.)
- [ ] **Stripe confirmation** that the model is acceptable, on a **separate account/entity** (PRD §6).
- [ ] Clinician sanity-check of the muscle-risk trigger thresholds before they go live (the *pattern* is sourced; the exact rolling-window cutoffs are your product judgment and should be reviewed).

---

## 7. Sources

**Pharmacokinetics:** PMC (NCBI) tirzepatide pharmacology review (t½ ~5 days, Tmax, bioavailability, protein binding); Coskun et al. Mol Metab 2022 / Mounjaro EMA SmPC (via clinical summaries); multiple clinical pharmacology summaries for semaglutide (~7 days / 168 h) and retatrutide (~6 days, Jastreboff et al. Nature Medicine 2023).

**Muscle / protein:** American Journal of Clinical Nutrition — joint Advisory (ACLM, ASN, OMA, TOS), 2025 (protein targets, 0.4–0.5 floor, ≤2 g/kg ceiling, 80–120 g/d, 1.5 g/kg FFM); Endocrine Society ENDO 2025 press release & Healthline coverage (Haines et al., MGH/Harvard — ~40% lean mass, higher risk in women/older adults/low protein); NCBI PMC review on optimizing GLP-1 therapy (>1.2 g/kg/day, resistance training); Mass General Advances in Motion (exercise + protein for lean-mass preservation).

**iOS PWA notifications:** WebKit/Apple (iOS 16.4 home-screen requirement); OneSignal & Pushwoosh implementation docs (manifest requirements, home-screen + user-gesture rules, in-app-browser exclusion, no background sync); MobiLoud & MagicBell 2026 limitation guides (reliability, opt-in reach, storage eviction, no auto-prompt).

**Reconstitution math:** standard U-100 syringe arithmetic, validated by the test suite in §2.2.

*Re-verify all values before each major release.*
