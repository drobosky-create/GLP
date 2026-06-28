import type { DoseEvent } from "../../types";

/**
 * Canonical subcutaneous injection sites for the rotation map (MVP §3 item 2).
 * Screen-local reference data — kept out of /lib (frozen §7.1) and out of the
 * presentational components. Purely factual site labels; no clinical advice.
 */
export interface InjectionSite {
  id: string;
  region: string; // grouped row in the body map
  side: "Left" | "Right";
}

export const INJECTION_SITES: InjectionSite[] = [
  { id: "arm-l", region: "Upper arm", side: "Left" },
  { id: "arm-r", region: "Upper arm", side: "Right" },
  { id: "abdomen-l", region: "Abdomen", side: "Left" },
  { id: "abdomen-r", region: "Abdomen", side: "Right" },
  { id: "thigh-l", region: "Thigh", side: "Left" },
  { id: "thigh-r", region: "Thigh", side: "Right" },
];

export const SITE_REGIONS = ["Upper arm", "Abdomen", "Thigh"] as const;

export interface SiteUsage {
  count: number;
  lastUsed?: string; // ISO datetime
}

/** Per-site usage derived from the user's own logged doses. */
export function siteUsage(doses: DoseEvent[]): Record<string, SiteUsage> {
  const usage: Record<string, SiteUsage> = {};
  for (const site of INJECTION_SITES) usage[site.id] = { count: 0 };
  for (const dose of doses) {
    const id = dose.injectionSite;
    if (!id || !usage[id]) continue;
    const u = usage[id];
    u.count += 1;
    if (!u.lastUsed || dose.datetime > u.lastUsed) u.lastUsed = dose.datetime;
  }
  return usage;
}

/**
 * "Where next" — describes the user's own rotation, it does not prescribe.
 * Prefers a never-used site; otherwise the least-recently-used. Returns the
 * site id, or undefined if there are no sites.
 */
export function suggestNextSite(doses: DoseEvent[]): string | undefined {
  const usage = siteUsage(doses);
  let best: InjectionSite | undefined;
  let bestKey = Number.POSITIVE_INFINITY;
  for (const site of INJECTION_SITES) {
    const u = usage[site.id];
    // Never-used sorts first (key 0); otherwise key on last-used timestamp.
    const key = u.count === 0 ? 0 : u.lastUsed ? Date.parse(u.lastUsed) : 1;
    if (key < bestKey) {
      bestKey = key;
      best = site;
    }
  }
  return best?.id;
}
