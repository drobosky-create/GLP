import { useMemo, useState } from "react";
import { useAppStore, nowMs } from "../../state/store";
import {
  proteinTargetRange,
  muscleRiskFlag,
  type ProteinBasis,
} from "../../lib/muscle";
import { canAccess } from "../../lib/billing";
import {
  Button,
  Card,
  DateTimeField,
  Field,
  Select,
  TextInput,
  formatWhen,
} from "../../components/Form";

const DAY = 86_400_000;
const BASES: { id: ProteinBasis; label: string }[] = [
  { id: "bodyWeight", label: "Body weight" },
  { id: "leanMass", label: "Lean mass" },
];

/** Muscle-preservation module (Phase 5) — Pro via canAccess("muscle"). */
export function Muscle() {
  const entitlement = useAppStore((s) => s.entitlement);
  const setScreen = useAppStore((s) => s.setScreen);
  const weights = useAppStore((s) => s.weights); // newest first
  const intake = useAppStore((s) => s.intake);
  const strength = useAppStore((s) => s.strength);
  const logIntake = useAppStore((s) => s.logIntake);
  const logStrength = useAppStore((s) => s.logStrength);
  const deleteStrength = useAppStore((s) => s.deleteStrength);

  const [basis, setBasis] = useState<ProteinBasis>("bodyWeight");
  const [protein, setProtein] = useState("");
  const [metric, setMetric] = useState("Reps at fixed weight");
  const [strengthVal, setStrengthVal] = useState("");
  const [strengthAt, setStrengthAt] = useState(nowMs());

  const latest = weights[0];
  const massKg = useMemo(() => {
    if (!latest) return null;
    if (basis === "leanMass") {
      return latest.bodyFatPct != null
        ? latest.weightKg * (1 - latest.bodyFatPct / 100)
        : null;
    }
    return latest.weightKg;
  }, [latest, basis]);

  const target = massKg != null ? proteinTargetRange(massKg, basis) : null;
  const targetMidG = target
    ? Math.round((target.lowGramsPerDay + target.highGramsPerDay) / 2)
    : 0;

  // Avg daily protein over the last 7 days from logged intake.
  const adherence = useMemo(() => {
    const cutoff = Date.now() - 7 * DAY;
    const perDay = new Map<string, number>();
    for (const e of intake) {
      if (e.proteinG == null || e.at < cutoff) continue;
      const key = new Date(e.at).toDateString();
      perDay.set(key, (perDay.get(key) ?? 0) + e.proteinG);
    }
    const days = perDay.size;
    const avg = days
      ? Math.round([...perDay.values()].reduce((a, b) => a + b, 0) / days)
      : 0;
    return { days, avg };
  }, [intake]);

  const risk = useMemo(() => {
    if (weights.length < 2 || targetMidG <= 0) return null;
    const asc = [...weights].sort((a, b) => a.at - b.at);
    const first = asc[0];
    const last = asc[asc.length - 1];
    const weeksElapsed = Math.max(
      0,
      (last.at - first.at) / (7 * DAY),
    );
    return muscleRiskFlag({
      startWeightKg: first.weightKg,
      currentWeightKg: last.weightKg,
      weeksElapsed,
      avgDailyProteinG: adherence.avg,
      proteinTargetG: targetMidG,
    });
  }, [weights, adherence.avg, targetMidG]);

  if (!canAccess("muscle", entitlement)) {
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
    await logIntake({ at: nowMs(), proteinG: g });
    setProtein("");
  };
  const onLogStrength = async () => {
    const v = Number(strengthVal);
    if (!(v > 0)) return;
    await logStrength({ at: strengthAt, metric, value: v });
    setStrengthVal("");
    setStrengthAt(nowMs());
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

      {risk?.flagged && risk.message ? (
        <Card title="Worth a conversation">
          <p className="text-sm text-warning">{risk.message}</p>
          <p className="mt-2 text-xs text-muted">
            A general, non-diagnostic prompt based on your logged data.
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
              {BASES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </Select>
          </Field>
          {target ? (
            <p className="text-sm text-text">
              Target around{" "}
              <span className="font-display">
                {target.lowGramsPerDay}–{target.highGramsPerDay} g/day
              </span>
              .
            </p>
          ) : (
            <p className="text-sm text-muted">
              {basis === "leanMass"
                ? "Log a weight with body-fat % to use the lean-mass basis."
                : "Log a weight to see a target."}
            </p>
          )}
          {target ? <p className="text-xs text-muted">{target.note}</p> : null}
        </div>
      </Card>

      <Card title="This week's protein">
        {adherence.days === 0 ? (
          <p className="text-sm text-muted">Log protein to track adherence.</p>
        ) : (
          <p className="text-sm text-text">
            Averaging {adherence.avg} g/day over {adherence.days} logged day
            {adherence.days === 1 ? "" : "s"}
            {targetMidG > 0 && adherence.avg < targetMidG * 0.85
              ? " — under your target."
              : "."}
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
            <Button onClick={onLogStrength} disabled={!(Number(strengthVal) > 0)}>
              Add
            </Button>
          </div>
          <DateTimeField label="When" value={strengthAt} onChange={setStrengthAt} />
          {strength.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {strength.slice(0, 5).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
                >
                  <span className="text-text">
                    {c.metric}: {c.value}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">{formatWhen(c.at)}</span>
                    <button
                      type="button"
                      onClick={() => deleteStrength(c.id)}
                      className="text-xs text-muted underline"
                    >
                      Delete
                    </button>
                  </div>
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
          with your provider.
        </p>
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
