/**
 * health.ts — Apple Health / Health Connect sync adapter (PRD §3 item 12, §7
 * fast-follow). App-layer adapter (not part of the verified core); the only place
 * that talks to a health plugin. Screens/store call these; nothing else imports it.
 *
 * NATIVE-ONLY: HealthKit (iOS) and Health Connect (Android) don't exist on web, so
 * the web path is a clean no-op. The device binding is GATED — it needs the native
 * shells plus Health entitlements (HealthKit capability on iOS; Health Connect
 * permissions in the Android manifest), which land with the App Store track. Until
 * then the native calls are scaffolded with a documented insertion point, mirroring
 * the APNs/FCM push stub in notify.ts.
 *
 * Scope: imports WEIGHT readings into the existing WeightEntry store (fits the core
 * as-is). Steps need a new core type + Repo method — tracked separately, not here.
 *
 * Neutrality: this only imports the user's own measured data; it recommends nothing.
 */

import { Capacitor } from "@capacitor/core";

export interface WeightSample {
  at: number; // epoch ms
  weightKg: number;
  source?: string;
}

export interface HealthResult {
  ok: boolean;
  reason: string;
}

const isNative = (): boolean => Capacitor.isNativePlatform();

/** Health sync is only meaningful on a native build. */
export function healthAvailable(): boolean {
  return isNative();
}

/**
 * Request read permission for weight. GATED: bind a Capacitor health plugin here
 * once the native shells + Health entitlements exist (e.g. `capacitor-health`:
 * `Health.requestHealthPermissions({ permissions: ["READ_WEIGHT"] })`). Until then
 * this reports "not yet configured" rather than guessing a plugin API.
 */
export async function requestHealthPermissions(): Promise<HealthResult> {
  if (!isNative()) {
    return { ok: false, reason: "Health sync is available in the native app." };
  }
  try {
    // NATIVE INSERTION POINT — wire the chosen health plugin's permission request.
    return {
      ok: false,
      reason: "Health permissions need the native build (not yet configured).",
    };
  } catch {
    return { ok: false, reason: "Health is not configured on this device." };
  }
}

/**
 * Read weight samples since `sinceMs`. GATED: query HealthKit / Health Connect via
 * the plugin and map to WeightSample[]. Returns [] until bound (and on web).
 */
export async function readWeightSamples(sinceMs: number): Promise<WeightSample[]> {
  void sinceMs;
  if (!isNative()) return [];
  // NATIVE INSERTION POINT — query weight samples and return them mapped to kg.
  return [];
}

/**
 * Pure: which incoming samples are NOT already represented in existing entries, so
 * repeated syncs don't create duplicates. A sample counts as already-present if an
 * existing entry has the same weight (within 0.05 kg) close in time (within
 * `toleranceMs`, default 1 hour). Unit-tested in tests/health.test.ts.
 */
export function newWeightSamples(
  samples: WeightSample[],
  existing: { at: number; weightKg: number }[],
  toleranceMs = 3_600_000,
): WeightSample[] {
  return samples.filter(
    (s) =>
      !existing.some(
        (e) =>
          Math.abs(e.at - s.at) <= toleranceMs &&
          Math.abs(e.weightKg - s.weightKg) < 0.05,
      ),
  );
}
