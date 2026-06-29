import { useState } from "react";
import { useAppStore, nowMs } from "../../state/store";
import type { SideEffectType } from "../../types";
import {
  Button,
  Card,
  DateTimeField,
  Field,
  Select,
  formatWhen,
} from "../../components/Form";

const TYPES: { value: SideEffectType; label: string }[] = [
  { value: "nausea", label: "Nausea" },
  { value: "fatigue", label: "Fatigue" },
  { value: "constipation", label: "Constipation" },
  { value: "diarrhea", label: "Diarrhea" },
  { value: "headache", label: "Headache" },
  { value: "injection_site", label: "Injection-site reaction" },
  { value: "appetite_loss", label: "Decreased appetite" },
  { value: "other", label: "Other" },
];

const SEVERITY_LABELS = ["None", "Mild", "Moderate", "Severe"];

function typeLabel(t: SideEffectType): string {
  return TYPES.find((x) => x.value === t)?.label ?? t;
}

/** Side-effect log (MVP §3 item 4) — type + severity (0–3 per the core model). */
export function Effects() {
  const sideEffects = useAppStore((s) => s.sideEffects);
  const logSideEffect = useAppStore((s) => s.logSideEffect);

  const [type, setType] = useState<SideEffectType>("nausea");
  const [severity, setSeverity] = useState(1);
  const [at, setAt] = useState(nowMs());

  const onSubmit = async () => {
    await logSideEffect({ at, type, severity });
    setSeverity(1);
    setAt(nowMs());
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title="Log a side effect">
        <div className="flex flex-col gap-3">
          <Field label="Type">
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as SideEffectType)}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={`Severity: ${SEVERITY_LABELS[severity]} (${severity}/3)`}>
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </Field>

          <DateTimeField label="When" value={at} onChange={setAt} />
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
                    {typeLabel(e.type)} · {SEVERITY_LABELS[e.severity] ?? e.severity}{" "}
                    (severity {e.severity}/3)
                  </span>
                  <span className="text-xs text-muted">{formatWhen(e.at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
