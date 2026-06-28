import { useState } from "react";
import { useAppStore, nowIso } from "../../state/store";
import {
  Button,
  Card,
  DateTimeField,
  Field,
  Select,
  formatWhen,
} from "../../components/Form";

// Neutral symptom labels (descriptive, not advice). "Other" lets the user name
// anything not listed.
const SIDE_EFFECT_TYPES = [
  "Nausea",
  "Fatigue",
  "Constipation",
  "Diarrhea",
  "Headache",
  "Decreased appetite",
  "Injection-site reaction",
  "Heartburn",
  "Dizziness",
  "Other",
];

/** Side-effect log (MVP §3 item 4) — type + user-rated severity (0–10). */
export function Effects() {
  const sideEffects = useAppStore((s) => s.sideEffects);
  const logSideEffect = useAppStore((s) => s.logSideEffect);
  const deleteSideEffect = useAppStore((s) => s.deleteSideEffect);

  const [type, setType] = useState(SIDE_EFFECT_TYPES[0]);
  const [severity, setSeverity] = useState(3);
  const [datetime, setDatetime] = useState(nowIso());

  const onSubmit = async () => {
    await logSideEffect({ datetime, type, severity });
    setSeverity(3);
    setDatetime(nowIso());
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title="Log a side effect">
        <div className="flex flex-col gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {SIDE_EFFECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={`Severity: ${severity} / 10`}>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </Field>

          <DateTimeField label="When" value={datetime} onChange={setDatetime} />
          <Button onClick={onSubmit}>Log side effect</Button>
        </div>
      </Card>

      <Card title="Recent side effects">
        {sideEffects.length === 0 ? (
          <p className="text-sm text-muted">No side effects logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sideEffects.slice(0, 20).map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-text">
                    {e.type} · severity {e.severity}/10
                  </span>
                  <span className="text-xs text-muted">
                    {formatWhen(e.datetime)}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => deleteSideEffect(e.id)}>
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
