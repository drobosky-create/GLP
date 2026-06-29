# Tally — GLP-1 Companion

**Track. Log. Report.** A neutral logging and calculation tool for a GLP-1 journey:
dose/weight/side-effect logging, a doctor-shareable correlation report, a
muscle-preservation module, an illustrative medication-level curve, and a
flag-gated compounded mode (reconstitution + vial inventory).

Built once in **React + Vite + TypeScript + Tailwind v4** and wrapped with
**Capacitor** to target iOS, Android, and web from one codebase.

> **Editorial neutrality is an architectural constraint, not a disclaimer.** The app
> describes the user's own logged data. It never recommends a substance, dose, or
> change, and there is no buy/reorder/storefront surface anywhere. See PRD §1.5.

## Quick start

```bash
npm ci
npm run dev        # web dev server
npm run build      # tsc -b + vite build (type-check + production build)
npm test           # the verified-core test gates (see below)
```

Node 20+ (CI uses Node 22).

## The verified core (do not regenerate)

`src/lib`, `src/types`, and `tests/` are a **pre-built, strict-typechecked, tested
core**. The UI is wired *to* it; the logic, math, and clinical constants are not
re-derived in screens. Contract details: [`docs/Core-Integration-Guide.md`](docs/Core-Integration-Guide.md).

- `db.ts` — `Repo` over a pluggable `Storage`. The only module that persists. Web
  uses `src/state/indexedStorage.ts` (IndexedDB); native can swap a Capacitor
  implementation of the same interface.
- `billing.ts` — entitlement, trial, feature gating (`canAccess`), dual paywall.
- `report.ts` — correlation report model (pure; the PDF renderer is a thin consumer).
- `pk.ts` — relative/illustrative medication-level curve math (Reference Sheet §1).
- `muscle.ts` — protein targets + non-diagnostic muscle-risk flag (Ref §3).
- `peptides.ts` — the compound catalog (data; add compounds = append objects, §8.1).
- `recon.ts` — reconstitution math (Ref §2); covered by `tests/recon.test.ts`.

If the core needs a change, propose it (e.g. as a GitHub issue) rather than editing
it inline — see the delete-methods example in the history (issue #1).

## Test gates

```bash
npx tsx tests/recon.test.ts     # reconstitution math (§2.2 known-good cases)
npx tsx tests/report.test.ts    # report + Repo + neutrality scan
npx tsx tests/billing.test.ts   # entitlement / gating / trial / purchase safety
```

`npm test` runs all three; CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run
build`, and `npm test` on every PR and on `main`.

## Project structure (frozen, PRD §7.1)

```
src/
  screens/      one folder per screen (Home, Log, Report, Muscle, Curve, Paywall,
                Onboarding, Library, Stacks, Education, Reconstitution, Vials, …)
  components/   shared presentational components (Logo, Form, charts, TabBar)
  styles/theme.css   THE single source of UI tokens (Tailwind v4 @theme) — no raw
                     hex / font / magic spacing anywhere else
  assets/       logo + self-hosted Inter font
  lib/          the verified core (above) + notify.ts (notifications adapter)
  state/        one Zustand store + the IndexedDB storage adapter
  types/        shared data model
tests/          the core test suites
docs/           PRD, Reference Sheet, Core Integration Guide, brand kit
```

## Feature flags (build-time, off by default)

| Env var | Effect |
|---|---|
| `VITE_COMPOUNDED_MODE=true` | Enables compounded mode (reconstitution, vials, research peptides). Gated pending **legal review** (§9). |
| `VITE_EDUCATION_ENABLED=true` | Enables the Learn surface. Cited but **draft pending clinical + legal review**. |
| `VITE_STRIPE_CHECKOUT_URL` | Stripe Payment Link for web checkout (publishable link only — never a secret key). |

## Human-gated checkpoints (not code)

- **Native push:** Apple Developer + APNs key, Google Play + FCM; then `npx cap add ios/android`. (Web reminders work without these.)
- **Billing go-live:** confirm the model with Stripe on a **separate account/entity** before setting `VITE_STRIPE_CHECKOUT_URL` (PRD §6).
- **Compounded mode + Learn + muscle-risk thresholds:** legal/clinician review before enabling (PRD §9 / Ref §6).
