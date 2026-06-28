/**
 * billing.ts — the ONLY place that touches Stripe (external web link) + store IAP.
 * Exposes a single Entitlement interface so both payment paths share one source of
 * truth (PRD §6, §7.1). Screens never touch Stripe/IAP directly.
 *
 * Dual paywall (§6): external link to Stripe checkout in the SYSTEM browser (not a
 * webview) + IAP/Play Billing alongside; architected so a Link-Entitlement
 * commission/reporting step can be switched on later without a rewrite.
 *
 * Phase 4 fills this in.
 */
export {};
