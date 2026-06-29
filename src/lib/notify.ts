/**
 * notify.ts — the single owner of the notifications concern (PRD §7.1 pattern;
 * added in Phase 2 by deliberate decision). The ONLY place that touches a
 * notification plugin or the web Notification API. Screens/store call these
 * functions; nothing else imports the plugins.
 *
 * Reminders are LOCAL and time-based (dose due / weigh-in) — no backend needed,
 * which fits the local-first design (§7). On native (Capacitor) they schedule real
 * background reminders via @capacitor/local-notifications; on web they degrade to a
 * best-effort in-session timer + the Web Notification API ("web degrades to local
 * notifications", §7).
 *
 * The remote APNs/FCM push path is SCAFFOLDED but inert: real tokens require the
 * human-gated Apple Developer/APNs + Google/FCM credentials (kickoff checkpoint),
 * so registerForPush() is a safe no-op until those exist.
 */

import { Capacitor } from "@capacitor/core";
import type { Weekday } from "@capacitor/local-notifications";

/**
 * Reminder is an app-layer notification setting (not part of the persisted clinical
 * core/AppData), so this module owns its shape. Stored via prefs (localStorage) by
 * the store, scheduled here.
 */
export interface Reminder {
  id: string;
  kind: "dose" | "weighin";
  enabled: boolean;
  hour: number; // 0–23 local
  minute: number; // 0–59
  weekday?: number; // ISO 1=Mon … 7=Sun; set => weekly, unset => daily
  title: string;
  body: string;
}

export type NotifPermission = "granted" | "denied" | "default" | "unsupported";

const isNative = (): boolean => Capacitor.isNativePlatform();

// Stable integer ids the native scheduler needs, keyed by reminder kind.
const NATIVE_IDS: Record<Reminder["kind"], number> = { dose: 1001, weighin: 1002 };

export function notificationsSupported(): boolean {
  if (isNative()) return true;
  return typeof window !== "undefined" && "Notification" in window;
}

function normalizeDisplay(display: string): NotifPermission {
  if (display === "granted") return "granted";
  if (display === "denied") return "denied";
  return "default";
}

export async function getPermission(): Promise<NotifPermission> {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const res = await LocalNotifications.checkPermissions();
    return normalizeDisplay(res.display);
  }
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission as NotifPermission;
}

/** Must be called from a user gesture (e.g. a button tap). */
export async function requestPermission(): Promise<NotifPermission> {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const res = await LocalNotifications.requestPermissions();
    return normalizeDisplay(res.display);
  }
  if (!notificationsSupported()) return "unsupported";
  return (await Notification.requestPermission()) as NotifPermission;
}

// ISO weekday (1=Mon…7=Sun) -> Capacitor Weekday (1=Sunday…7=Saturday).
function toCapacitorWeekday(iso: number): Weekday {
  return (iso === 7 ? 1 : iso + 1) as Weekday;
}

// JS Date dow (0=Sun…6=Sat) from ISO weekday.
function isoToJsDow(iso: number): number {
  return iso % 7;
}

/** Next local Date this reminder should fire. */
function nextOccurrence(r: Reminder, from: Date): Date {
  const next = new Date(from);
  next.setHours(r.hour, r.minute, 0, 0);
  if (r.weekday != null) {
    const target = isoToJsDow(r.weekday);
    let days = (target - from.getDay() + 7) % 7;
    if (days === 0 && next <= from) days = 7;
    next.setDate(from.getDate() + days);
  } else if (next <= from) {
    next.setDate(from.getDate() + 1);
  }
  return next;
}

// Web-only: best-effort timers, alive only while the page is open. Re-armed on
// each app launch by the store during hydrate.
const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearWebTimer(id: string): void {
  const handle = webTimers.get(id);
  if (handle !== undefined) {
    clearTimeout(handle);
    webTimers.delete(id);
  }
}

function armWebTimer(r: Reminder): void {
  clearWebTimer(r.id);
  const delay = Math.max(0, nextOccurrence(r, new Date()).getTime() - Date.now());
  const handle = setTimeout(() => {
    if (notificationsSupported() && Notification.permission === "granted") {
      new Notification(r.title, { body: r.body });
    }
    armWebTimer(r); // re-arm for the following occurrence
  }, delay);
  webTimers.set(r.id, handle);
}

export async function scheduleReminder(r: Reminder): Promise<void> {
  await cancelReminder(r);
  if (!r.enabled) return;

  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NATIVE_IDS[r.kind],
          title: r.title,
          body: r.body,
          schedule: {
            on: {
              hour: r.hour,
              minute: r.minute,
              ...(r.weekday != null
                ? { weekday: toCapacitorWeekday(r.weekday) }
                : {}),
            },
            repeats: true,
            allowWhileIdle: true,
          },
        },
      ],
    });
    return;
  }

  if (notificationsSupported() && Notification.permission === "granted") {
    armWebTimer(r);
  }
}

export async function cancelReminder(r: Reminder): Promise<void> {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({
      notifications: [{ id: NATIVE_IDS[r.kind] }],
    });
    return;
  }
  clearWebTimer(r.id);
}

export interface PushStatus {
  available: boolean;
  reason: string;
}

/**
 * GATED scaffold for remote APNs/FCM push. Real tokens require Apple Developer +
 * APNs key and Google/FCM setup (kickoff human checkpoint). Until configured this
 * returns a safe, descriptive no-op; the native wiring is here for when creds land.
 */
export async function registerForPush(): Promise<PushStatus> {
  if (!isNative()) {
    return { available: false, reason: "Push requires the native app" };
  }
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") {
      return { available: false, reason: "Permission not granted" };
    }
    // Token delivery only succeeds once APNs/FCM credentials are configured.
    await PushNotifications.register();
    return { available: true, reason: "Awaiting APNs/FCM credentials for tokens" };
  } catch {
    return {
      available: false,
      reason: "Push not configured (APNs/FCM credentials required)",
    };
  }
}
