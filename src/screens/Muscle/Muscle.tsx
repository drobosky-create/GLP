import { useEffect, useMemo, useState } from "react";
import { useAppStore, nowIso } from "../../state/store";
import {
  computeProteinTarget,
  muscleRiskFlag,
  proteinAdherence,
  type ProteinBasis,
} from "../../lib/muscle";
import {
  Button,
  Card,
  DateTimeField,
  Field,
  Select,
  TextInput,
  formatWhen,
} from "../../components/Form";

const BASIS_OPTIONS: { id: ProteinBasis; label: string }[] = [
  { id: "bodyWeight", label: "Body weight" },
  { id: "leanMass", label: "Lean mass" },
  { id: "absolute", label: "Absolute (80–120 g)" },
];

/** Muscle-preservation module (Phase 5) — premium (§6). Constants from Ref §3. */
export function Muscle() {
  const premium = useAppStore((s) => s.premium);
  const recompute = useAppStore((s) => s.recomputeEntitlement);
  const setScreen = useAppStore((s) => s.setScreen);
  const weightEntries = useAppStore((s) => s.weightEntries);
  const intakeEntries = useAppStore((s) => s.intakeEntries);
  const strengthCheckins = useAppStore((s) => s.strengthCheckins);
  const logIntake = useAppStore((s) => s.logIntake);
  const logStrength = useAppStore((s) => s.logStrength);

  const [basis, setBasis] = useState<ProteinBasis>("bodyWeight");
  const [protein, setProtein] = useState("");
  const [metric, setMetric] = useState("Reps at fixed weight");
  const [strengthVal, setStrengthVal] = useState("");
  const [strengthAt, setStrengthAt] = useState(nowIso());

  useEffect(() => {
    recompute();
  }, [recompute]);

  const latestWeight = weightEntries[0];
  const target = useMemo(
    () =>
      computeProteinTarget(
        basis,
        latestWeight?.weightKg,
        latestWeight?.bodyFatPct,
      ),
    [basis, latestWeight],
  );
  const adherence = useMemo(
    () => proteinAdherence(intakeEntries, target.target, Date.now()),
    [intakeEntries, target.target],
  );
  const risk = useMemo(
    () => muscleRiskFlag(weightEntries, adherence, Date.now()),
    [weightEntries, adherence],
  );

  if (!premium) {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-semibold text-text">
            Muscle preservation
          </h1>
          <p className="text-xs text-muted">
            Protein targets and a gentle muscle-protection check, from your own
            logs.
          </p>
        </header>
        <Card title="A premium feature">
          <p className="mb-3 text-sm text-muted">
            The muscle-preservation module is part of Premium.
          </p>
          <Button onClick={() => setScreen("paywall")}>
            Start free trial to unlock
          </Button>
        </Card>
        <Button variant="ghost" onClick={() => setScreen("home")}>
          Back to Home
        </Button>
      </div>
    );
  }

  const onLogProtein = async () => {
    const g = Number(protein);
    if (!(g > 0)) return;
    await logIntake({ datetime: nowIso(), proteinG: g });
    setProtein("");
  };

  const onLogStrength = async () => {
    const v = Number(strengthVal);
    if (!(v > 0)) return;
    await logStrength({ datetime: strengthAt, metric, value: v });
    setStrengthVal("");
    setStrengthAt(nowIso());
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          Muscle preservation
        </h1>
        <p className="text-xs text-muted">
          General published guidance applied to your own logs — not a personalized
          prescription.
        </p>
      </header>

      {risk.flagged && risk.message ? (
        <Card title="Worth a conversation">
          <p className="text-sm text-warning">{risk.message}</p>
          <p className="mt-2 text-xs text-muted">
            This is a general, non-diagnostic prompt based on your logged data.
          </p>
        </Card>
      ) : null}

      <Card title="Protein target (general guidance)">
        <div className="flex flex-col gap-3">
          <Field label="Basis">
            <Select
              value={basis}
              onChange={(e) => setBasis(e.target.value as ProteinBasis)}
            >
              {BASIS_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          {target.target != null ? (
            <p className="text-sm text-text">
              Target around <span className="font-display">{target.target} g/day</span>
              {target.low != null && target.high != null
                ? ` (range ${target.low}–${target.high} g)`
                : ""}
              .
            </p>
          ) : (
            <p className="text-sm text-muted">{target.missing}</p>
          )}
          <p className="text-xs text-muted">{target.note}</p>
        </div>
      </Card>

      <Card title="This week's protein">
        {adherence.daysLogged === 0 ? (
          <p className="text-sm text-muted">
            Log your protein to track adherence.
          </p>
        ) : (
          <p className="text-sm text-text">
            Averaging {adherence.avgProteinG} g/day over {adherence.daysLogged}{" "}
            logged day{adherence.daysLogged === 1 ? "" : "s"}
            {adherence.pctOfTarget != null
              ? ` (${Math.round(adherence.pctOfTarget * 100)}% of target)`
              : ""}
            {adherence.underTarget ? " — under your target." : "."}
          </p>
        )}
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Field label="Log protein (g)">
              <TextInput
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
          <Button onClick={onLogProtein} disabled={!(Number(protein) > 0)}>
            Add
          </Button>
        </div>
      </Card>

      <Card title="Strength check-in">
        <div className="flex flex-col gap-3">
          <Field label="Metric">
            <Select value={metric} onChange={(e) => setMetric(e.target.value)}>
              <option>Reps at fixed weight</option>
              <option>Grip strength</option>
              <option>Subjective (1–10)</option>
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Value">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={strengthVal}
                  onChange={(e) => setStrengthVal(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
            <Button
              onClick={onLogStrength}
              disabled={!(Number(strengthVal) > 0)}
            >
              Add
            </Button>
          </div>
          <DateTimeField
            label="When"
            value={strengthAt}
            onChange={setStrengthAt}
          />
          {strengthCheckins.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {strengthCheckins.slice(0, 5).map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between rounded-md border border-border p-2 text-sm"
                >
                  <span className="text-text">
                    {c.metric}: {c.value}
                  </span>
                  <span className="text-muted">{formatWhen(c.datetime)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Card>

      <Card>
        <p className="text-xs text-muted">
          General published guidance, not personalized medical advice. It never
          recommends a medication, dose, or specific eating plan — discuss targets
          and muscle protection with your provider.
        </p>
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
