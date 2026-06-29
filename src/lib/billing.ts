// billing.ts — the ONLY module that owns subscription/entitlement logic (PRD §6).
//
// Pure logic here: trial state, what counts as "entitled", feature gating, and
// turning a CONFIRMED purchase from either channel into one Entitlement. The actual
// network calls live in thin adapters Claude Code wires up:
//   - Stripe external link  -> open system browser to Checkout (US, post–Epic v. Apple)
//   - Apple StoreKit / Google Play Billing -> native IAP
//   - receipt/webhook verification -> server or RevenueCat
// Both channels resolve to the SAME Entitlement through applyPurchase().
//
// SAFETY (PRD §5): a purchase is only applied when explicitly confirmed — no charge
// or upgrade without an unmistakable user action. Cancelling preserves access until
// the period ends (no surprise lockout), and there are no silent renewals here.

import { Entitlement, PurchaseChannel } from "../types";

const DAY = 86_400_000;

export type AccessLevel = "free" | "trial" | "pro";

export type Feature =
  | "dose_log" | "reminders"          // FREE
  | "report" | "muscle" | "med_curve" | "photo_progress" | "export"; // PRO

const FREE_FEATURES = new Set<Feature>(["dose_log", "reminders"]);

export const freeEntitlement = (): Entitlement => ({ tier: "free" });

/** Current access level, derived (never trust a stored boolean alone). */
export function accessLevel(ent: Entitlement, now: number = Date.now()): AccessLevel {
  if (ent.trialEnd && now < ent.trialEnd) return "trial";
  if (ent.tier === "pro" && (ent.paidUntil === undefined || now < ent.paidUntil)) return "pro";
  return "free";
}

export const isEntitled = (ent: Entitlement, now: number = Date.now()): boolean =>
  accessLevel(ent, now) !== "free";

/** Feature gating: free features always pass; everything else needs entitlement. */
export function canAccess(feature: Feature, ent: Entitlement, now: number = Date.now()): boolean {
  return FREE_FEATURES.has(feature) || isEntitled(ent, now);
}

/** Start the free trial. Trial is an overlay; paid tier stays "free" until purchase. */
export function startTrial(now: number = Date.now(), days = 7, base?: Entitlement): Entitlement {
  const ent = base ?? freeEntitlement();
  if (ent.trialEnd) return ent; // never restart a trial
  return { ...ent, trialEnd: now + days * DAY };
}

export function daysLeftInTrial(ent: Entitlement, now: number = Date.now()): number {
  if (!ent.trialEnd || now >= ent.trialEnd) return 0;
  return Math.ceil((ent.trialEnd - now) / DAY);
}

export interface PurchaseResult {
  confirmed: boolean;        // MUST be true — explicit user confirmation (PRD §5)
  periodEndMs: number;       // current paid period end
  autoRenew: boolean;
  stripeCustomerId?: string; // when channel = stripe_link
}

/** Apply a confirmed purchase from either channel. Throws if not confirmed. */
export function applyPurchase(
  channel: PurchaseChannel,
  result: PurchaseResult,
  base?: Entitlement,
): Entitlement {
  if (!result.confirmed) {
    throw new Error("billing: refusing to grant entitlement without explicit confirmation.");
  }
  const ent = base ?? freeEntitlement();
  return {
    ...ent,
    tier: "pro",
    paidUntil: result.periodEndMs,
    autoRenew: result.autoRenew,
    channel,
    stripeCustomerId: result.stripeCustomerId ?? ent.stripeCustomerId,
  };
}

/** Cancel auto-renew but keep access until the paid period ends (no surprise lockout). */
export function cancelAutoRenew(ent: Entitlement): Entitlement {
  return { ...ent, autoRenew: false };
}

// ---- Paywall presentation (PRD §6: show BOTH channels, let the user choose) ----

export interface PriceConfig {
  webMonthlyDisplay: string;   // e.g. "$9.99/mo"
  webAnnualDisplay: string;    // e.g. "$59.99/yr"
  iapMonthlyDisplay: string;
  iapAnnualDisplay: string;
  /** Apple "Link Entitlement" reporting toggle — off today, switchable later (§6). */
  linkCommissionEnabled?: boolean;
}

export interface PaywallOption {
  channel: PurchaseChannel;
  label: string;
  monthlyDisplay: string;
  annualDisplay: string;
  note: string;
}

/** Build the options to render. On iOS we show stripe_link + apple_iap; on Android, google_iap. */
export function buildPaywall(platform: "ios" | "android" | "web", cfg: PriceConfig): PaywallOption[] {
  const web: PaywallOption = {
    channel: "stripe_link",
    label: "Subscribe on the web",
    monthlyDisplay: cfg.webMonthlyDisplay,
    annualDisplay: cfg.webAnnualDisplay,
    note: "Opens a secure checkout in your browser.",
  };
  const iap: PaywallOption = {
    channel: platform === "android" ? "google_iap" : "apple_iap",
    label: "Subscribe in-app",
    monthlyDisplay: cfg.iapMonthlyDisplay,
    annualDisplay: cfg.iapAnnualDisplay,
    note: "Billed through your app store account.",
  };
  if (platform === "web") return [web];
  return [web, iap]; // both, per §6
}

export interface LinkAttribution { channel: PurchaseChannel; at: number; }

/** Record that a purchase originated from the external link (for later §6 reporting). */
export function recordLinkAttribution(at: number = Date.now()): LinkAttribution {
  return { channel: "stripe_link", at };
}
