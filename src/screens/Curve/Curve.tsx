import { useMemo, useState } from "react";
import { useAppStore } from "../../state/store";
import { curveForCompound, hoursToSteadyState } from "../../lib/pk";
import { compoundById } from "../../lib/peptides";
import { canAccess } from "../../lib/billing";
import { CurveChart } from "../../components/CurveChart";
import { Button, Card, Field, Select } from "../../components/Form";

const HOUR = 3_600_000;

/** Medication-level curve (Phase 6) — Pro via canAccess("med_curve"). Ref §1. */
export function Curve() {
  const entitlement = useAppStore((s) => s.entitlement);
  const setScreen = useAppStore((s) => s.setScreen);
  const doses = useAppStore((s) => s.doses);

  // Compounds the user has actually logged, with their dose events.
  const logged = useMemo(() => {
    const ids = Array.from(new Set(doses.map((d) => d.compoundId)));
    return ids
      .map((id) => {
        const compound = compoundById(id);
        const events = doses.filter((d) => d.compoundId === id);
        return compound && events.length > 0 ? { id, compound } : null;
      })
      .filter((x): x is { id: string; compound: NonNullable<ReturnType<typeof compoundById>> } => x !== null);
  }, [doses]);

  const [compoundId, setCompoundId] = useState<string>("");
  const activeId = logged.find((l) => l.id === compoundId)?.id ?? logged[0]?.id;

  const result = useMemo(() => {
    if (!activeId) return null;
    const events = doses
      .filter((d) => d.compoundId === activeId)
      .map((d) => ({ at: d.at, amount: d.doseMg }));
    if (events.length === 0) return null;
    const start = Math.min(...events.map((e) => e.at));
    const now = Date.now();
    const pkEvents = events.map((e) => ({
      atHours: (e.at - start) / HOUR,
      amount: e.amount,
    }));
    const endHours = Math.max(1, (now - start) / HOUR);
    const curve = curveForCompound(activeId, pkEvents, 0, endHours, 6);
    const peak = Math.max(1e-9, ...curve.points.map((p) => p.level));
    const current = curve.points[curve.points.length - 1]?.level ?? 0;
    const steadyWeeks = Math.max(
      1,
      Math.round(hoursToSteadyState(curve.compound.halfLifeHours) / 24 / 7),
    );
    const atSteady = now - start >= hoursToSteadyState(curve.compound.halfLifeHours) * HOUR;
    return {
      curve,
      currentPct: Math.round((current / peak) * 100),
      steadyWeeks,
      atSteady,
    };
  }, [activeId, doses]);

  if (!canAccess("med_curve", entitlement)) {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-semibold text-text">
            Medication level
          </h1>
          <p className="text-xs text-muted">
            An illustrative view of how your logged doses build up over time.
          </p>
        </header>
        <Card title="A premium feature">
          <p className="mb-3 text-sm text-muted">
            The medication-level curve is part of Premium.
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

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          Medication level
        </h1>
        <p className="text-xs text-muted">
          A relative, illustrative estimate from your logged doses — not a blood
          measurement.
        </p>
      </header>

      {!result || !activeId ? (
        <Card>
          <p className="text-sm text-muted">
            Log a few doses of an injectable to see your level build up over time.
          </p>
        </Card>
      ) : (
        <>
          <Card title="Compound">
            <Field label="Showing">
              <Select
                value={activeId}
                onChange={(e) => setCompoundId(e.target.value)}
              >
                {logged.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.compound.displayName}
                  </option>
                ))}
              </Select>
            </Field>
            {result.curve.lowConfidence ? (
              <p className="mt-2 text-xs text-warning">
                Estimated · low-confidence half-life — this curve is a rough
                approximation for {result.curve.compound.displayName}.
              </p>
            ) : null}
          </Card>

          <Card title="Where you are">
            <p className="text-sm text-text">
              Your level is around{" "}
              <span className="font-display">{result.currentPct}%</span> of your
              highest logged level.
            </p>
            <p className="mt-1 text-sm text-text">
              {result.atSteady
                ? `Based on your start date, your levels have likely stabilized (around week ${result.steadyWeeks}).`
                : `Your levels are still building — they typically stabilize around week ${result.steadyWeeks} of consistent dosing.`}
            </p>
            <p className="mt-1 text-xs text-muted">
              Half-life used: ~{Math.round(result.curve.compound.halfLifeHours / 24)} days.
            </p>
          </Card>

          <Card title="Relative level over time">
            <CurveChart points={result.curve.points} />
          </Card>
        </>
      )}

      <Card>
        <p className="text-xs text-muted">
          Illustrative and relative only — not a measurement of the drug in your
          blood, and not for timing or changing doses. Discuss any changes with your
          provider.
        </p>
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
