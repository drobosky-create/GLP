import { useState } from "react";
import { useAppStore, nowMs } from "../../state/store";
import { healthAvailable } from "../../lib/health";
import {
  Button,
  Card,
  DateTimeField,
  Field,
  TextInput,
  formatWhen,
} from "../../components/Form";

/** Weight + optional body-composition log (MVP §3 item 3). */
export function Weight() {
  const weightEntries = useAppStore((s) => s.weights);
  const logWeight = useAppStore((s) => s.logWeight);
  const deleteWeight = useAppStore((s) => s.deleteWeight);
  const syncHealth = useAppStore((s) => s.syncHealth);
  const [healthNote, setHealthNote] = useState("");
  const [syncing, setSyncing] = useState(false);

  const onSyncHealth = async () => {
    setSyncing(true);
    try {
      setHealthNote((await syncHealth()).reason);
    } finally {
      setSyncing(false);
    }
  };

  const [at, setAt] = useState(nowMs());
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [waist, setWaist] = useState("");

  const weightValue = Number(weight);
  const canSubmit = weight !== "" && weightValue > 0;

  const onSubmit = async () => {
    if (!canSubmit) return;
    await logWeight({
      at,
      weightKg: weightValue,
      bodyFatPct: bodyFat !== "" ? Number(bodyFat) : undefined,
      waistCm: waist !== "" ? Number(waist) : undefined,
    });
    setWeight("");
    setBodyFat("");
    setWaist("");
    setAt(nowMs());
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title="Log weight">
        <div className="flex flex-col gap-3">
          <Field label="Weight (kg)">
            <TextInput
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Body fat % (optional)">
              <TextInput
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                placeholder="—"
              />
            </Field>
            <Field label="Waist (cm, optional)">
              <TextInput
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                placeholder="—"
              />
            </Field>
          </div>
          <DateTimeField label="When" value={at} onChange={setAt} />
          <Button onClick={onSubmit} disabled={!canSubmit}>
            Log weight
          </Button>
        </div>
      </Card>

      <Card title="Apple Health / Health Connect">
        <p className="mb-3 text-xs text-muted">
          Import weight readings from your device's health app. Only your own
          measured data is imported — nothing is shared out.
        </p>
        {healthAvailable() ? (
          <Button onClick={onSyncHealth} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync weight from Health"}
          </Button>
        ) : (
          <p className="text-sm text-muted">
            Available in the native app (iOS Health / Android Health Connect).
          </p>
        )}
        {healthNote ? (
          <p className="mt-2 text-xs text-text">{healthNote}</p>
        ) : null}
      </Card>

      <Card title="Recent entries">
        {weightEntries.length === 0 ? (
          <p className="text-sm text-muted">No weight entries yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {weightEntries.slice(0, 20).map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-text">
                    {w.weightKg} kg
                    {w.bodyFatPct != null ? ` · ${w.bodyFatPct}% bf` : ""}
                    {w.waistCm != null ? ` · ${w.waistCm} cm waist` : ""}
                  </span>
                  <span className="text-xs text-muted">{formatWhen(w.at)}</span>
                </div>
                <Button variant="ghost" onClick={() => deleteWeight(w.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
