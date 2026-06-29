# Core Integration Guide — how the UI wires to the pre-built `/src/lib`

The logic core is done, typed, and tested. This guide is the contract: it tells the UI layer exactly what each module exposes and how screens should use it. **Do not call into module internals or re-implement any of this — import the functions below.**

Golden rule (PRD §7.1): **screens never touch storage, billing, or math directly beyond these exported functions.** A screen renders state and calls a lib function; that's it.

---

## `db.ts` — storage & persistence
The only module that persists data. Screens go through one `Repo` instance held in app state (Zustand).

- `new Repo(storage)` — construct with a `Storage`. Use `MemoryStorage` in tests; in the app, inject the native/IndexedDB `Storage` implementation you write in Phase 1.
- `await repo.init()` — load persisted data on app start.
- `await repo.addDose({ compoundId, doseMg, at, injectionSite? })` and likewise `addWeight`, `addSideEffect`, `addIntake`, `addStrength`, `addMedication`, `addVial`. Each returns the saved record (with `id`) and persists.
- `await repo.setEntitlement(ent)` — persist entitlement after a purchase/trial change.
- Read (already sorted by time): `repo.doses()`, `repo.weights()`, `repo.sideEffects()`, `repo.entitlement()`, `repo.snapshot()`.

**Phase 1 task:** implement `Storage` (native SQLite/Preferences via Capacitor; IndexedDB on web) — just `load()` and `save()`. Everything else already works against the interface.

## `peptides.ts` — the compound catalog (data)
- `COMPOUNDS` — the array. Render selection lists from this.
- `compoundsForMode("prescribed" | "compounded")` — filtered list for the active onboarding mode.
- `compoundById(id)` — resolve a logged dose's compound for display.
- Adding a compound = append one object (PRD §8.1 schema). Never branch logic on specific compounds.

## `pk.ts` — medication-level curve (relative/illustrative)
- `curveForCompound(compoundId, doseEvents, startHours, endHours, stepHours?)` → `{ points, compound, lowConfidence }`.
  - `points: {tHours, level}[]` feeds the chart.
  - **`lowConfidence` true → the chart MUST show an "estimated, low-confidence" label** (PRD §1.3 / §8.1).
- Always label this curve as estimated/educational, never a plasma measurement.
- Convert your stored `DoseEvent[]` into `{atHours, amount}` relative to the user's start.

## `muscle.ts` — protein targets & risk flag (general guidance)
- `proteinTargetRange(massKg, basis?)` → `{ lowGramsPerDay, highGramsPerDay, note }`. Render the `note` verbatim — it carries the "general guidance, not a prescription" framing.
- `muscleRiskFlag({ startWeightKg, currentWeightKg, weeksElapsed, avgDailyProteinG, proteinTargetG })` → `{ flagged, message? }`. If `flagged`, show `message` as a gentle, provider-referring nudge. Never turn it into a directive.

## `report.ts` — the Correlation Report (paid hero)
- `buildReport(doses, weights, sideEffects)` → `ReportModel`.
  - `summaryLines: string[]` — render as-is; they are neutrality-checked. Do not append advice.
  - `weight.points`, `doseIncreases`, `sideEffects[]` feed the chart overlays.
  - `disclaimer` — always render it on screen and in the PDF.
- **PDF:** the renderer is a thin consumer — pass `ReportModel` to your PDF lib and lay out `summaryLines` + chart + `disclaimer`. No logic in the PDF layer.
- Gate this screen with `canAccess("report", entitlement)` (see billing).

## `billing.ts` — entitlement & paywall
- `accessLevel(ent, now?)` → `"free" | "trial" | "pro"`; `isEntitled(ent, now?)`.
- `canAccess(feature, ent, now?)` — **gate every Pro screen with this.** Pro features: `"report" | "muscle" | "med_curve" | "photo_progress" | "export"`. Free: `"dose_log" | "reminders"`.
- `startTrial(now?, days?, base?)` — call once when the user opts into the 7-day trial; persist via `repo.setEntitlement`.
- `daysLeftInTrial(ent, now?)` — for the trial banner.
- `buildPaywall(platform, priceConfig)` → options to render (web + IAP on mobile; web-only on web, per §6).
- `applyPurchase(channel, result, base?)` — call ONLY with a confirmed `PurchaseResult` from your Stripe-link or IAP adapter; it throws on `confirmed:false` (PRD §5). Persist the result.
- `cancelAutoRenew(ent)` — keeps access until period end.

**Phase 4 task:** write the thin adapters — open Stripe Checkout in the system browser (external link), and the StoreKit/Play Billing calls — each returning a `PurchaseResult` you hand to `applyPurchase`. Consider RevenueCat to unify receipts.

---

## Verify the core anytime
```
npx tsx tests/recon.test.ts     # reconstitution math
npx tsx tests/report.test.ts    # correlation report + db repo + neutrality scan
npx tsx tests/billing.test.ts   # entitlement, gating, trial, purchase safety
```
All three pass today. They are the gates in the kickoff prompt — keep them green.
