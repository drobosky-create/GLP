import { useEffect, useState } from "react";
import { useAppStore } from "../../state/store";
import type { Reminder } from "../../lib/notify";
import { Button, Card, Field, Select } from "../../components/Form";
import {
  getPermission,
  notificationsSupported,
  requestPermission,
  type NotifPermission,
} from "../../lib/notify";
import { Capacitor } from "@capacitor/core";

const WEEKDAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "Monday" },
  { iso: 2, label: "Tuesday" },
  { iso: 3, label: "Wednesday" },
  { iso: 4, label: "Thursday" },
  { iso: 5, label: "Friday" },
  { iso: 6, label: "Saturday" },
  { iso: 7, label: "Sunday" },
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Reminders settings (Phase 2) — local dose / weigh-in reminders. */
export function Reminders() {
  const reminders = useAppStore((s) => s.reminders);
  const saveReminder = useAppStore((s) => s.saveReminder);
  const [permission, setPermission] = useState<NotifPermission>("default");

  useEffect(() => {
    void getPermission().then(setPermission);
  }, []);

  const ensurePermission = async (): Promise<boolean> => {
    let p = permission;
    if (p !== "granted") {
      p = await requestPermission();
      setPermission(p);
    }
    return p === "granted";
  };

  const update = async (reminder: Reminder, patch: Partial<Reminder>) => {
    const next = { ...reminder, ...patch };
    // Turning a reminder on requires permission first.
    if (next.enabled && !reminder.enabled) {
      const ok = await ensurePermission();
      if (!ok) return;
    }
    await saveReminder(next);
  };

  const isWeb = !Capacitor.isNativePlatform();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          Reminders
        </h1>
        <p className="text-xs text-muted">
          Local reminders to log your own data — they never tell you to take a
          medication.
        </p>
      </header>

      {!notificationsSupported() ? (
        <Card>
          <p className="text-sm text-muted">
            Notifications aren’t supported in this environment.
          </p>
        </Card>
      ) : permission === "denied" ? (
        <Card>
          <p className="text-sm text-warning">
            Notifications are blocked. Enable them in your device settings to use
            reminders.
          </p>
        </Card>
      ) : null}

      {reminders.map((r) => (
        <Card
          key={r.id}
          title={r.kind === "dose" ? "Dose reminder (weekly)" : "Weigh-in reminder (daily)"}
        >
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-text">Enabled</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-accent"
                checked={r.enabled}
                onChange={(e) => update(r, { enabled: e.target.checked })}
              />
            </label>

            <Field label="Time">
              <input
                type="time"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
                value={`${pad(r.hour)}:${pad(r.minute)}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(":").map(Number);
                  void update(r, { hour: h, minute: m });
                }}
              />
            </Field>

            {r.kind === "dose" ? (
              <Field label="Day of week">
                <Select
                  value={String(r.weekday ?? 1)}
                  onChange={(e) =>
                    void update(r, { weekday: Number(e.target.value) })
                  }
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.iso} value={d.iso}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>
        </Card>
      ))}

      {isWeb ? (
        <Card>
          <p className="text-xs text-muted">
            On the web, reminders fire only while the app is open. Install the
            native app for reliable background reminders.
          </p>
        </Card>
      ) : null}

      <Button variant="ghost" onClick={() => useAppStore.getState().setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
