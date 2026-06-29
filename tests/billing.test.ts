// billing.test.ts — entitlement state, gating, trial, dual-channel purchase, safety.
// Run: npx tsx tests/billing.test.ts
import {
  freeEntitlement, accessLevel, isEntitled, canAccess, startTrial, daysLeftInTrial,
  applyPurchase, cancelAutoRenew, buildPaywall, PurchaseResult,
} from "../src/lib/billing";

const DAY = 86_400_000;
const now = Date.UTC(2026, 0, 1);

let failures = 0;
const check = (name: string, ok: boolean) => { console.log((ok ? "PASS  " : "FAIL  ") + name); if (!ok) failures++; };

// Free baseline
const free = freeEntitlement();
check("new user is free", accessLevel(free, now) === "free");
check("free user gets dose_log", canAccess("dose_log", free, now));
check("free user gets reminders", canAccess("reminders", free, now));
check("free user BLOCKED from report", !canAccess("report", free, now));
check("free user BLOCKED from muscle/curve/export",
  !canAccess("muscle", free, now) && !canAccess("med_curve", free, now) && !canAccess("export", free, now));

// Trial overlay
const trial = startTrial(now, 7);
check("trial active grants pro features", canAccess("report", trial, now) && accessLevel(trial, now) === "trial");
check("trial shows 7 days left", daysLeftInTrial(trial, now) === 7);
check("trial expires after 7 days", accessLevel(trial, now + 8 * DAY) === "free");
check("expired trial blocks report", !canAccess("report", trial, now + 8 * DAY));
const trial2 = startTrial(now + 3 * DAY, 7, trial);
check("trial never restarts", trial2.trialEnd === trial.trialEnd);

// Purchase — Stripe link
const ok: PurchaseResult = { confirmed: true, periodEndMs: now + 365 * DAY, autoRenew: true, stripeCustomerId: "cus_123" };
const paid = applyPurchase("stripe_link", ok, free);
check("confirmed stripe purchase -> pro", accessLevel(paid, now) === "pro" && canAccess("export", paid, now));
check("stripe customer id retained", paid.stripeCustomerId === "cus_123" && paid.channel === "stripe_link");
check("pro lapses after period end", accessLevel(paid, now + 366 * DAY) === "free");

// Purchase — IAP
const iapPaid = applyPurchase("apple_iap", { confirmed: true, periodEndMs: now + 30 * DAY, autoRenew: true }, free);
check("confirmed IAP purchase -> pro", isEntitled(iapPaid, now) && iapPaid.channel === "apple_iap");

// SAFETY: unconfirmed purchase must throw (PRD §5)
let threw = false;
try { applyPurchase("stripe_link", { confirmed: false, periodEndMs: now + 365 * DAY, autoRenew: true }, free); }
catch { threw = true; }
check("unconfirmed purchase is REFUSED", threw);

// Cancel keeps access until period end
const cancelled = cancelAutoRenew(paid);
check("cancel preserves access until period end", cancelled.autoRenew === false && canAccess("report", cancelled, now));

// Paywall shows both channels on mobile, one on web (PRD §6)
const cfg = { webMonthlyDisplay: "$9.99/mo", webAnnualDisplay: "$59.99/yr", iapMonthlyDisplay: "$10.99/mo", iapAnnualDisplay: "$69.99/yr" };
check("iOS paywall shows web + IAP", buildPaywall("ios", cfg).length === 2);
check("Android paywall uses google_iap", buildPaywall("android", cfg).some(o => o.channel === "google_iap"));
check("web paywall is stripe-only", buildPaywall("web", cfg).length === 1 && buildPaywall("web", cfg)[0].channel === "stripe_link");

console.log(failures === 0 ? "\nALL BILLING TESTS PASSED" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
