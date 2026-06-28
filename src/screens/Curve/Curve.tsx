import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../state/store";
import { buildCurve } from "../../lib/pk";
import { getCompound } from "../../lib/peptides";
import { CurveChart } from "../../components/CurveChart";
import { Button, Card, Field, Select } from "../../components/Form";

/** Medication-level curve (Phase 6) — premium (§6). Math/constants from Ref §1. */
export function Curve() {
  const premium = useAppStore((s) => s.premium);
  const recompute = useAppStore((s) => s.recomputeEntitlement);
  const setScreen = useAppStore((s) => s.setScreen);
  const medications = useAppStore((s) => s.medications);
  const doseEvents = useAppStore((s) => s.doseEvents);

  useEffect(() => {
    recompute();
  }, [recompute]);

  // Compounds the user has actually logged doses for.
  const logged = useMemo(() => {
    return medications
      .map((m) => {
        const compound = getCompound(m.compoundId);
        const doses = doseEvents
          .filter((d) => d.medicationId === m.id)
          .map((d) => ({ t: Date.parse(d.datetime), dose: d.dose }));
        return compound && doses.length > 0 ? { compound, doses } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [medications, doseEvents]);

  const [compoundId, setCompoundId] = useState<string>("");
  const selected =
    logged.find((l) => l.compound.id === compoundId) ?? logged[0];

  const model = useMemo(
    () =>
      selected
        ? buildCurve(selected.doses, selected.compound, Date.now())
        : null,
    [selected],
  );

  if (!premium) {
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

  const currentPct =
    model && model.peakLevel > 0
      ? Math.round((model.currentLevel / model.peakLevel) * 100)
      : 0;

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

      {logged.length === 0 || !selected || !model ? (
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
                value={selected.compound.id}
                onChange={(e) => setCompoundId(e.target.value)}
              >
                {logged.map((l) => (
                  <option key={l.compound.id} value={l.compound.id}>
                    {l.compound.displayName}
                  </option>
                ))}
              </Select>
            </Field>
            {model.estimated ? (
              <p className="mt-2 text-xs text-warning">
                Estimated · low-confidence half-life — this curve is a rough
                approximation for {selected.compound.displayName}.
              </p>
            ) : null}
          </Card>

          <Card title="Where you are">
            <p className="text-sm text-text">
              Your level is around{" "}
              <span className="font-display">{currentPct}%</span> of your highest
              logged level.
            </p>
            <p className="mt-1 text-sm text-text">
              {model.atSteadyState
                ? `Based on your start date, your levels have likely stabilized (around week ${model.weeksToSteadyState}).`
                : `Your levels are still building — they typically stabilize around week ${model.weeksToSteadyState} of consistent dosing.`}
            </p>
            <p className="mt-1 text-xs text-muted">
              Half-life used: ~{Math.round(model.halfLifeHours / 24)} days.
            </p>
          </Card>

          <Card title="Relative level over time">
            <CurveChart model={model} />
          </Card>
        </>
      )}

      <Card>
        <p className="text-xs text-muted">
          Illustrative and relative only — this is not a measurement of the drug in
          your blood, and it should not be used to time or change doses. Discuss any
          changes with your provider.
        </p>
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
