# Product Requirements Document — GLP-1 Companion (working title)

> **Purpose of this doc:** This is a build spec written to be handed to Claude Code. It defines what to build, in what order, and the non-negotiable constraints. Where a value needs human verification before shipping, it is marked **[VERIFY]** — do not let the build invent clinical numbers.

---

## 1. Product thesis (the one sentence)

The app that turns a messy GLP-1 journey into **the one-page report your prescriber respects** — and the only one that tracks **muscle preservation**, not just weight loss.

Logging is a commodity (every competitor does it, some give it away free). Our paid value is the **side-effect-vs-dose correlation report** and **body-composition/strength trends** — both of which only become valuable over months, which is what makes a subscription survive past month 4.

## 1.5 Core constraint — editorial neutrality (NON-NEGOTIABLE)

The app is a **neutral logging and calculation tool**. This is an architectural constraint, not a disclaimer. It is what simultaneously protects the legal posture, the payment processor relationship, and the partner distribution model.

**The firewall:**
- The app NEVER recommends, sells, links to, or facilitates the purchase of any substance, dose, brand, or pharmacy.
- No "reorder here" buttons. No in-app storefront. No co-branded "buy" surfaces. No affiliate links to products.
- The user enters their own protocol; the app reflects their data back. It never originates a clinical recommendation.
- **Partners may distribute the app; they may not appear inside it as sellers.** Partner presence is limited to cosmetic, non-commercial attribution at most (see §9.5). When in doubt, leave it out.

Any feature request that would put a seller, a product link, or a purchase path inside the app is **out of scope by definition**, regardless of who asks for it.

## 2. Target users — two modes, one app

| | **Prescribed mode (ship first)** | **Compounded mode (ship later)** |
|---|---|---|
| Who | On brand GLP-1s (Wegovy, Ozempic, Zepbound, Mounjaro, oral forms) | DIY / compounded / research-chem crowd |
| Needs | Dose log, titration schedule, side-effect tracking, doctor report | All of the above **+ reconstitution math + vial inventory** |
| Risk | Low. App-Store-safe, payment-safe | Higher liability + payment-processor risk |
| Decision | **MVP** | Behind a feature flag; enable after billing is stable |

Onboarding asks one question — "Are you on a prescribed brand medication or a compounded/self-administered protocol?" — and routes to the right mode. Core data model is shared; compounded mode unlocks extra modules.

## 3. Scope

### MVP (Prescribed mode) — weeks 1–4
1. Dose log (medication, dose, date/time, injection site)
2. Injection-site rotation map (visual body map, "where next")
3. Weight + body-composition log (weight, optional body-fat %, waist)
4. Side-effect log (nausea, fatigue, constipation, etc., with severity)
5. Reminders (local notifications: dose due, weigh-in)
6. **HERO FEATURE — Correlation Report:** side-effect severity & weight trend mapped against the dose-escalation timeline, exportable as a clean one-page PDF for a doctor visit
7. Protein/fiber/water quick-log (lightweight; not a full macro tracker — see non-goals)
8. Subscription paywall + free trial (see §6)

### Fast-follow — weeks 5–8
9. Muscle-preservation module: strength check-ins, protein-target adherence, "muscle risk" flag when weight loss is fast but protein/strength is dropping **[VERIFY thresholds with a clinician/literature]**
10. Estimated medication-level curve ("how much drug is in your system") **[VERIFY half-life/PK constants per drug — do NOT hardcode guessed values]**
11. Photo progress (side-by-side comparisons)
12. Apple Health / Health Connect sync (weight, steps)

### Compounded mode (feature-flagged, post-revenue)
13. Reconstitution calculator: vial strength (mg) + BAC water (mL) → concentration → units on a U-100 syringe for a target dose. **[VERIFY the math with test cases before exposing it — a wrong unit calc in a health context is the worst possible bug.]**
14. Vial inventory ("doses remaining," reconstitution date, discard-after date)

## 4. Feature detail — the parts worth getting exactly right

### 4.1 Correlation Report (the reason people pay)
- Single screen + exportable PDF.
- X-axis: time. Overlays: dose level (step chart), weight (line), side-effect severity (heat/markers).
- Plain-language summary line generated from the data ("Nausea peaked the 2 days after each dose increase; resolved by day 4"). **Describes patterns in the user's own logged data — never gives medical advice or dosing recommendations.**
- This is the feature behind the paywall. Competitors have proven users will pay for exactly this.

### 4.2 Muscle-preservation module (the differentiator)
- Track: protein intake vs target, optional strength check-in (e.g., reps at a fixed weight, grip, or subjective), lean-mass estimate if body-fat % is logged.
- Surface a gentle flag, not a diagnosis: "Your weight is dropping fast and protein has been below target — worth discussing muscle protection with your provider." **No prescriptive advice.**

### 4.3 Reconstitution calculator (compounded mode only)
- Inputs: vial mg, BAC water mL, desired dose (mg or mcg), syringe type (U-100 default).
- Output: units to draw, concentration, doses per vial.
- Ship with a **test suite of known-good cases**. Display a persistent "verify with your provider; this is a calculator, not medical advice" notice.

## 5. Reliability bar (the anti-churn list — treat as requirements, not nice-to-haves)
Competitors are bleeding users over basics. Do not repeat these:
- No login/auth loops. Auth must be dead simple (passwordless/magic-link or local-only).
- Never charge without an unmistakable, explicit confirmation. No surprise renewals.
- No rating-prompt loops; rating prompt fires **once**, dismissible, never blocks an action.
- Logging a dose and logging weight must both be reachable without restarting anything.
- Local-first: the app works offline and feels instant. Sync is additive, never a dependency for core logging.

## 6. Subscription & pricing
- **Price band:** $8–10/mo, discounted annual (~$59–69/yr). Floor competitor is $4.99; premium is $12.99 — sit in the upper-middle and justify it with the report + muscle module.
- **Free trial is mandatory** (everyone offers 7 days). Use 7-day trial → annual default.
- **Free tier:** basic dose log + reminders only. **Paywall:** the Correlation Report, muscle module, medication-level curve, photo progress, export. (This mirrors the proven willingness-to-pay line — competitors paywall exactly the analytics.)
- **Billing model (US, post–Epic v. Apple, 2025):** dual paywall.
  - **External web link → your existing Stripe checkout.** US App Store rules now permit a button/link that sends users to web checkout, and Apple takes no commission on that web purchase (you keep ~97% after Stripe's 2.9% + 30¢). This is what preserves your existing Stripe rails on native. Open in the system browser, NOT a webview. Follow Apple's current link-presentation rules.
  - **IAP / Google Play Billing offered alongside.** You generally cannot remove store billing entirely for a non-reader app, so offer it too for the frictionless two-tap converters. Apple's cut is 15% (Small Business Program, under $1M) / Google's is 15% first-year, lower after.
  - **Default the paywall to show both** and let the user pick.
- **Fee caveat (not fully settled):** Apple asserts a "Link Entitlement" commission (up to 27%, 12% Small Business) on link-originated purchases within a 7-day attribution window, with mandatory reporting; the courts have not finalized a rate. **Build the external-link flow now (effectively ~0% today) but architect so a commission/reporting step can be switched on later without a rewrite.** Capture link-purchase analytics from day one.
- **Stripe account safety:** Stand the new product up under a **separate account/entity** — do NOT commingle it with any existing seasoned Stripe account, because a restricted-business review can freeze the *whole* account. Confirm the model with Stripe directly before building billing. **[VERIFY with Stripe]** Editorial neutrality (§1.5) is what keeps this on the "software tool," not "drug seller," side of Stripe's line.
- **Entitlement source of truth:** Stripe (web) + store receipts (IAP), reconciled to a single `Entitlement` record. Consider RevenueCat to unify cross-platform entitlement if hand-rolling becomes the time sink. Entitlement cached locally, verified on launch.

## 7. Tech architecture (for Claude Code)

**One codebase, three targets.** Write the app once in **React + Vite + TypeScript + Tailwind**, then wrap with **Capacitor** to ship native iOS, native Android, and a web build from the same source. This reuses one UI everywhere, gets you into both app stores (discovery + ratings social proof), and keeps the web build alive as your Stripe funnel. (Expo/React Native is the alternative — more native-feeling but a larger rewrite; Capacitor is chosen for reuse + speed + single-developer maintainability.)

- **Push notifications:** native via Capacitor plugins — APNs on iOS, FCM on Android. **This replaces the old PWA local-notification plan and removes the iOS "add to home screen" requirement entirely.** Reminders now work like any native app. (Web build degrades to local notifications where push isn't available.)
- **Local-first storage:** SQLite via Capacitor (or IndexedDB on web) for all health data. Privacy angle — "your data stays on your device" — is real and marketable.
- **Auth:** local-only to start (no account needed to use the core app); optional account later for cross-device sync. Never gate first-run behind signup.
- **Payments:** dual flow per §6 — external link to Stripe checkout (system browser) + store IAP. Abstract behind a single `billing` module so the two paths share one entitlement interface.
- **PDF export:** client-side generation for the doctor report.
- **Sync (fast-follow, optional):** encrypted cloud sync. Keep optional so hosting stays near-zero and the privacy claim holds.
- **Health integrations (fast-follow):** Apple Health / Health Connect via Capacitor plugins.

### 7.1 Frozen project structure (do not let the tree sprawl)
Claude Code must create exactly this top-level shape and keep all new code inside it. No ad-hoc folders mid-build.
```
/src
  /screens        # one folder per screen (Home, Log, Report, Muscle, Paywall, Onboarding…)
  /components     # shared presentational components only
    Logo.tsx      # the ONLY place the logo is referenced (wraps the SVG asset)
  /styles
    theme.css     # THE single source of truth for all UI tokens (color, type, radius)
  /assets
    logo.svg      # the one logo file
  /lib
    db.ts         # storage layer — the ONLY place that touches SQLite/IndexedDB
    billing.ts    # the ONLY place that touches Stripe link + IAP; exposes Entitlement
    pk.ts         # medication-level curve MATH only (model from Reference Sheet §1); reads peptides.ts
    peptides.ts   # the peptide CATALOG — single source of truth for compounds (schema §8.1)
    recon.ts      # reconstitution math + the test suite (from Reference Sheet §2)
    muscle.ts     # protein targets + risk-flag logic (from Reference Sheet §3)
    report.ts     # correlation report data assembly + PDF
  /state          # one store (e.g., Zustand) — single source of UI state
  /types          # all shared TypeScript types / the data model (§8)
/tests            # recon.ts test suite lives here and must pass before §9 ships
```
Rule: each `/lib` module is the single owner of its concern. Screens call lib functions; screens never talk to the DB or Stripe directly. This is what stops the tree-rot you hit in Replit/Lovable.

## 8. Data model (sketch)
- `Medication` (name, type: injectable/oral, brand vs compounded)
- `DoseEvent` (medication_id, dose, datetime, injection_site)
- `WeightEntry` (datetime, weight, body_fat_pct?, waist?)
- `SideEffectEntry` (datetime, type, severity)
- `IntakeEntry` (datetime, protein_g, fiber_g, water_ml) — lightweight
- `StrengthCheckin` (datetime, metric, value)
- `Vial` (compounded mode: strength_mg, bac_water_ml, recon_date, discard_after)
- `Entitlement` (tier, trial_end, stripe_customer_id)

A `Medication` the user logs references a `Compound` from the catalog (§8.1) by `id`. The catalog is reference data shipped with the app; user logs are separate.

### 8.1 Peptide catalog — FROZEN schema + seed (`/src/lib/peptides.ts`)

The catalog is **data, not logic.** Adding a compound = adding one object to this array; it never touches `pk.ts` or any screen. Freeze the schema now so the catalog grows by data entry, not refactor.

```ts
export type Confidence = "high" | "medium" | "low";

export interface Compound {
  id: string;             // stable slug, e.g. "semaglutide"
  displayName: string;    // "Semaglutide"
  brandNames?: string[];  // ["Ozempic", "Wegovy"]
  classLabel: string;     // "GLP-1" | "GLP-1/GIP" | "GH secretagogue" | ...
  mode: "prescribed" | "compounded" | "both";
  route: "subcutaneous" | "oral" | "other";
  halfLifeHours: number;  // drives the §1 curve math in pk.ts
  doseUnit: "mg" | "mcg" | "units";
  storage?: string;       // short, factual: "Refrigerate 2–8°C"
  source: string;         // provenance of halfLifeHours
  confidence: Confidence; // how solid that number is
  verified: boolean;      // false = needs [VERIFY] before relying on the curve
  notes?: string;
}
```

**Neutrality rule for the catalog (§1.5):** factual reference fields only — half-life, route, storage. **No `typicalDose` / recommended-dose field.** The user always enters their own dose; the app never ships a dosing recommendation, because that would cross from tool into advice.

**Seed — GLP-1 launch set.** Only the first three carry session-verified half-lives (Reference Sheet §1). The rest are scaffolded with `verified: false` and must be checked before their curve is trusted.

```ts
export const COMPOUNDS: Compound[] = [
  { id: "semaglutide", displayName: "Semaglutide", brandNames: ["Ozempic","Wegovy"],
    classLabel: "GLP-1", mode: "both", route: "subcutaneous",
    halfLifeHours: 168, doseUnit: "mg", source: "Reference Sheet §1 (peer-reviewed)",
    confidence: "high", verified: true },

  { id: "tirzepatide", displayName: "Tirzepatide", brandNames: ["Mounjaro","Zepbound"],
    classLabel: "GLP-1/GIP", mode: "both", route: "subcutaneous",
    halfLifeHours: 120, doseUnit: "mg", source: "Reference Sheet §1 (peer-reviewed/PMC)",
    confidence: "high", verified: true },

  { id: "retatrutide", displayName: "Retatrutide", classLabel: "GLP-1/GIP/glucagon",
    mode: "compounded", route: "subcutaneous",
    halfLifeHours: 144, doseUnit: "mg", source: "Reference Sheet §1 (trial; investigational)",
    confidence: "medium", verified: true },

  // --- scaffold: verify halfLifeHours before exposing the curve ---
  { id: "semaglutide-oral", displayName: "Semaglutide (oral)", brandNames: ["Rybelsus"],
    classLabel: "GLP-1", mode: "prescribed", route: "oral",
    halfLifeHours: 168, doseUnit: "mg", source: "[VERIFY] same molecule, oral route",
    confidence: "medium", verified: false },

  { id: "liraglutide", displayName: "Liraglutide", brandNames: ["Saxenda","Victoza"],
    classLabel: "GLP-1", mode: "prescribed", route: "subcutaneous",
    halfLifeHours: 13, doseUnit: "mg", source: "[VERIFY]",
    confidence: "low", verified: false },
];
```

**Growing it (Phase 7+):** research peptides (BPC-157, ipamorelin, CJC-1295, TB-500, tesamorelin, GHK-Cu, etc.) are appended as `mode: "compounded"` entries — almost all will be `confidence: "low"`/`verified: false`, because their half-lives are community-sourced, not clinical. The curve for any `verified: false` compound must render with a visible "estimated, low-confidence" label.

## 9. Legal / compliance framing (shapes copy and logic, not just a footer)
- Position explicitly as a **logging and calculation tool**. The user enters their own protocol; the app never recommends a substance, a dose, or a change.
- Persistent disclaimers; "consult your provider" language on any clinical-adjacent surface.
- No preloaded protocols that read as medical advice.
- Compounded mode uses "for informational/tracking purposes" framing throughout.
- Have an actual lawyer review before the compounded mode goes live. **[VERIFY with counsel]**

### 9.5 Partner distribution (pharmacies / peptide companies) — within the neutrality firewall
Partner relationships are the distribution moat (they solve customer acquisition, the category's hardest problem). They must be wired in without breaking §1.5:
- **Allowed:** partners distribute the app to their patients/customers (referral links, codes, bundled access, white-label shell). Revenue can flow from the *partner* (per-seat / per-patient B2B), not from drug referrals.
- **Allowed (cosmetic only):** light co-brand on a partner-distributed instance — e.g., "provided by [Partner]" — with no commercial/purchase function.
- **Forbidden:** any in-app path to buy a product, reorder, or be steered toward a specific substance/pharmacy. The app's logging and report logic stays identical regardless of which partner distributed it.
- **Why this matters:** the doctor-report and adherence value is *more* compelling to a pharmacy (it improves their patient retention/reorder rate) than to a random consumer — so a B2B2C motion is likely higher-margin and lower-CAC than pure B2C. The neutrality firewall is what lets you take partner money without becoming a regulated seller.

## 10. Non-goals (say no to these to protect the timeline)
- Full macro/calorie database with AI photo logging — competitors own this; lightweight protein/fiber/water is enough. Integrate, don't rebuild.
- Recipes, meal plans, coaching.
- Cloud sync, accounts, and AI features in the *first sitting* — they're fast-follows, not v1. (Native apps and store presence ARE now in scope — see §7.)

## 11. Build sequence for Claude Code — vertical slices, commit after each

Build in **vertical slices** (each slice = working, testable, committed), not horizontal layers. After every phase: it runs, you commit, *then* move on. This is the discipline that prevents tree-rot across a long session.

**Phase 0 — Skeleton (commit before any feature).** Scaffold React + Vite + TS + Tailwind, add Capacitor (iOS + Android + web), create the exact §7.1 folder structure with empty `/lib` modules and the `/types` data model from §8. App boots to an empty Home screen on web. Commit.

**Phase 1 — Core logging (the table stakes, must be flawless).** `db.ts` + screens for dose log, weight, side-effects, injection-site map. Reachable without restarts (§5). Commit.

**Phase 2 — Reminders via native push** (Capacitor APNs/FCM). Commit.

**Phase 3 — Correlation Report + PDF** (`report.ts`). The paid hero — make it genuinely good. Commit.

**Phase 4 — Dual paywall + entitlement** (`billing.ts`: Stripe external link + IAP stub, 7-day trial, gating). Commit.

**Phase 5 — Muscle module** (`muscle.ts`, constants from Reference Sheet §3). Commit.

**Phase 6 — Medication-level curve** (`pk.ts`, constants from Reference Sheet §1). Commit.

**Phase 7 — (flagged) Compounded mode** (`recon.ts` + `/tests` suite must pass before exposing; vial inventory). Commit.

*Fast-follows, NOT first sitting:* Apple Health/Health Connect sync, photo progress, cloud sync, AI features.

## 12. Build discipline (read this to Claude Code up front)
These rules exist because agentic builders rot the file tree when the spec drifts mid-session. The spec is frozen (this doc + the Reference Sheet) — hold to it.
- **One concern per `/lib` module; screens never touch the DB or billing directly.** (§7.1)
- **No new top-level folders** beyond §7.1 without it being a deliberate decision.
- **No new dependencies** beyond the agreed set (React, Vite, TS, Tailwind, Capacitor + needed plugins, a single state lib, a PDF lib, optionally RevenueCat) unless a phase explicitly requires one. Ask before adding.
- **Implement the current phase only.** Do not scaffold ahead or refactor earlier phases while building a later one.
- **All clinical constants come from the Reference Sheet** — never invent PK values, protein numbers, or recon math. Where the sheet says **[VERIFY]**, leave a clearly-marked stub, don't guess.
- **Commit at the end of every phase** with a one-line message. A broken phase is fixed before the next begins.
- **Copy is neutral (§1.5 / §5 / §9):** describe the user's own data, never recommend a substance, dose, or change; no buy/reorder anything.
- **All UI values come from `/src/styles/theme.css` (§13).** No raw hex, font name, or magic spacing in components — ever.

## 13. Design system — single source of truth (keep it to ONE file)

All visual values live in `/src/styles/theme.css`. Nothing — no component, no screen — uses a raw hex, a raw font name, or a magic pixel value anywhere else. This is the single biggest guard against the "every screen looks slightly different" rot.

**The mechanism (Tailwind v4):** define tokens once in an `@theme` block; Tailwind generates the utility classes automatically. No parallel JS config to drift.

```css
/* src/styles/theme.css — the ONLY place UI values are defined */
@import "tailwindcss";

@theme {
  /* COLOR — semantic roles, never value-names. Rebrand = edit here only. */
  --color-bg:       #0d0f10;   /* app background       */
  --color-surface:  #16191b;   /* cards, sheets        */
  --color-border:   #262b2e;
  --color-text:     #f2f4f5;   /* primary text         */
  --color-muted:    #9aa3a7;   /* secondary text       */
  --color-accent:   #4f8cff;   /* primary action/brand */
  --color-success:  #2fbf71;
  --color-warning:  #e3a008;
  --color-danger:   #e5484d;

  /* TYPE — two roles is enough */
  --font-display: "PLACEHOLDER", system-ui, sans-serif;
  --font-body:    "PLACEHOLDER", system-ui, sans-serif;

  /* SHAPE */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 22px;
}
```
Components then use only the generated utilities: `bg-bg`, `bg-surface`, `text-text`, `text-muted`, `text-accent`, `rounded-md`, `font-display`, etc.

**Rules:**
- **No raw hex, no raw font-family, no hardcoded brand radius/spacing outside `theme.css`.** If a value is needed, it becomes a token first.
- **Semantic names only** (`--color-accent`, not `--color-blue`) so rebrands and partner co-brands are a few-line override, tying directly to §9.5.
- **Logo lives in one place:** `assets/logo.svg`, referenced only through `components/Logo.tsx`. Never inline the SVG elsewhere.
- **Fonts loaded once** (one `@font-face`/link) and referenced only via the type tokens.
- **Dark/light or partner skin (optional, later):** because names are semantic, a theme is just a second block overriding the same token names — don't build it in the first sitting, but the structure leaves the door open for free.

**The actual palette and typefaces are a deliberate choice, not a default** — the values above are placeholders. Pick a direction grounded in the product (a calm, clinical-but-warm health tool) and avoid the generic near-black + single-bright-accent look unless it's truly chosen. Whatever you pick gets entered in this one file and nowhere else.

---

### Open verification items (do not ship without resolving)
- [ ] GLP-1 half-life / PK constants per drug — **resolved in Reference Sheet §1**, re-verify before release
- [ ] Muscle-risk flag thresholds — pattern **resolved in Reference Sheet §3**; exact cutoffs need a clinician glance
- [ ] Reconstitution math — **resolved + test suite in Reference Sheet §2**; tests must pass before Phase 7 ships
- [ ] Native push setup (APNs cert / FCM key) — provisioning is a human/account step
- [ ] External-link commission terms (Apple Link Entitlement final rate) — monitor; keep flow switchable
- [ ] Legal review of compounded-mode framing + Stripe confirmation on a separate account
