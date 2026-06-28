/**
 * billing.ts — the ONLY place that touches Stripe (external link) + store IAP, and
 * the single owner of the Entitlement record (PRD §6, §7.1). Screens never import
 * this; they go through the store, which delegates here.
 *
 * Dual paywall (§6): an external link to Stripe Checkout opened in the SYSTEM
 * browser (never a webview) + store IAP alongside, with one shared Entitlement
 * interface. Live keys/links come from env at go-live on a SEPARATE Stripe account
 * (human checkpoint) — none are committed. Link-purchase analytics are captured from
 * day one, and the flow is architected so Apple's Link-Entitlement commission/
 * reporting step can be switched on later without a rewrite.
 *
 * Neutrality (§1.5): this sells app premium features only — never a substance, dose,
 * pharmacy, or product. No reorder/storefront surfaces anywhere.
 */

import type { BillingEvent, Entitlement, EntitlementTier } from "../types";
import { db } from "./db";

const DAY_MS = 86_400_000;

export const BILLING_CONFIG = {
  trialDays: 7,
  // Publishable Stripe Payment Links only (never secret keys). Supplied at go-live
  // via env on the separate account; blank until the Stripe-confirmation checkpoint.
  fallbackCheckoutUrl: (import.meta.env.VITE_STRIPE_CHECKOUT_URL as string) ?? "",
  // Apple Link-Entitlement reporting can be enabled later without a rewrite.
  linkCommissionReportingEnabled: false,
};

export interface Plan {
  id: "annual" | "monthly";
  label: string;
  priceLabel: string;
  cadence: string;
  stripeLink: string;
  storeProductId: string;
}

// Pricing sits upper-middle of the band (§6): annual is the default.
export const PLANS: Plan[] = [
  {
    id: "annual",
    label: "Annual",
    priceLabel: "$59 / year",
    cadence: "billed yearly",
    stripeLink: (import.meta.env.VITE_STRIPE_ANNUAL_LINK as string) ?? "",
    storeProductId: "glp1_premium_annual",
  },
  {
    id: "monthly",
    label: "Monthly",
    priceLabel: "$9 / month",
    cadence: "billed monthly",
    stripeLink: (import.meta.env.VITE_STRIPE_MONTHLY_LINK as string) ?? "",
    storeProductId: "glp1_premium_monthly",
  },
];

export interface BillingResult {
  ok: boolean;
  reason: string;
}

// ---- Entitlement logic (pure) ----

export function startTrial(now: number): Entitlement {
  return {
    tier: "trial",
    trialEnd: new Date(now + BILLING_CONFIG.trialDays * DAY_MS).toISOString(),
  };
}

/** Resolves the live tier, accounting for trial expiry. */
export function effectiveTier(
  ent: Entitlement | null,
  now: number,
): EntitlementTier {
  if (!ent) return "free";
  if (ent.tier === "premium") return "premium";
  if (ent.tier === "trial" && ent.trialEnd && Date.parse(ent.trialEnd) > now) {
    return "trial";
  }
  return "free";
}

export function isPremium(ent: Entitlement | null, now: number): boolean {
  const t = effectiveTier(ent, now);
  return t === "premium" || t === "trial";
}

export function trialDaysLeft(
  ent: Entitlement | null,
  now: number,
): number | null {
  if (!ent || ent.tier !== "trial" || !ent.trialEnd) return null;
  const ms = Date.parse(ent.trialEnd) - now;
  return ms > 0 ? Math.ceil(ms / DAY_MS) : 0;
}

// ---- Analytics capture (day one, §6) ----

export async function captureBillingEvent(
  ev: Omit<BillingEvent, "id" | "datetime">,
): Promise<void> {
  await db.billingEvents.save({
    id: crypto.randomUUID(),
    datetime: new Date().toISOString(),
    ...ev,
  });
}

// ---- Purchase channels ----

/**
 * Stripe external link (§6). Opens the SYSTEM browser — on web that's a new tab; on
 * native the Apple-compliant default-browser presentation is finalized at submission
 * (gated). Never a webview. No charge happens here — the user confirms in Checkout.
 */
export async function openCheckout(plan: Plan): Promise<BillingResult> {
  await captureBillingEvent({
    type: "checkout_start",
    channel: "stripe_link",
    plan: plan.id,
  });
  const url = plan.stripeLink || BILLING_CONFIG.fallbackCheckoutUrl;
  if (!url) {
    return { ok: false, reason: "Checkout link not configured yet." };
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener");
  }
  return { ok: true, reason: "Opened secure checkout in your browser." };
}

/**
 * Store IAP (Apple/Google) — wired at native time behind store credentials and
 * optionally RevenueCat (§6 / gated). Not available on web.
 */
export async function purchaseViaStore(plan: Plan): Promise<BillingResult> {
  await captureBillingEvent({
    type: "iap_attempt",
    channel: "store_iap",
    plan: plan.id,
  });
  return {
    ok: false,
    reason: "In-app purchase is available in the native app.",
  };
}

/** Restore/reconcile entitlement from Stripe + store receipts (gated/backend). */
export async function restorePurchases(): Promise<BillingResult> {
  await captureBillingEvent({ type: "restore_attempt" });
  return {
    ok: false,
    reason: "Purchase restore activates with the native app and backend.",
  };
}
