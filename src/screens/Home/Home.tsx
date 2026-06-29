import { Logo } from "../../components/Logo";
import { Button, Card, formatWhen } from "../../components/Form";
import { useAppStore } from "../../state/store";
import { compoundById } from "../../lib/peptides";
import { accessLevel, daysLeftInTrial, isEntitled } from "../../lib/billing";

/**
 * Home — dashboard summarizing the user's OWN logged data and offering quick paths
 * to each log screen. Copy is neutral (PRD §1.5): it describes data, recommends
 * nothing. All values come from theme tokens (§13).
 */
export function Home() {
  const setScreen = useAppStore((s) => s.setScreen);
  const doseEvents = useAppStore((s) => s.doses);
  const weightEntries = useAppStore((s) => s.weights);
  const sideEffects = useAppStore((s) => s.sideEffects);
  const entitlement = useAppStore((s) => s.entitlement);
  const compoundedEnabled = useAppStore((s) => s.compoundedEnabled);
  const educationEnabled = useAppStore((s) => s.educationEnabled);
  const mode = useAppStore((s) => s.mode);
  const clearMode = useAppStore((s) => s.clearMode);

  const premium = isEntitled(entitlement);
  const trialDaysLeft =
    accessLevel(entitlement) === "trial" ? daysLeftInTrial(entitlement) : null;

  const latestWeight = weightEntries[0];
  const latestDose = doseEvents[0];
  const latestEffect = sideEffects[0];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Logo size={40} />
        <div className="flex flex-col">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text">
            Tally
          </h1>
          <p className="text-xs text-muted">Track. Log. Report.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => setScreen("dose")}>Log dose</Button>
        <Button onClick={() => setScreen("weight")}>Log weight</Button>
        <Button onClick={() => setScreen("effects")}>Log side effect</Button>
        <Button onClick={() => setScreen("sites")}>Injection sites</Button>
        <Button variant="ghost" onClick={() => setScreen("reminders")}>
          Reminders
        </Button>
      </div>

      <Button onClick={() => setScreen("report")}>View correlation report</Button>
      <Button variant="ghost" onClick={() => setScreen("muscle")}>
        Muscle preservation
      </Button>
      <Button variant="ghost" onClick={() => setScreen("curve")}>
        Medication level
      </Button>
      <Button variant="ghost" onClick={() => setScreen("stacks")}>
        My stacks
      </Button>
      {educationEnabled ? (
        <Button variant="ghost" onClick={() => setScreen("education")}>
          Learn
        </Button>
      ) : null}

      {premium ? (
        <p className="text-center text-xs text-success">
          {trialDaysLeft != null
            ? `Trial active — ${trialDaysLeft} day${
                trialDaysLeft === 1 ? "" : "s"
              } left`
            : "Premium active"}
        </p>
      ) : (
        <Button variant="ghost" onClick={() => setScreen("paywall")}>
          Start 7-day free trial
        </Button>
      )}

      {compoundedEnabled ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">Compounded tools</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={() => setScreen("recon")}>
              Reconstitution
            </Button>
            <Button variant="ghost" onClick={() => setScreen("vials")}>
              Vial inventory
            </Button>
          </div>
        </div>
      ) : null}

      <Card title="At a glance">
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex justify-between">
            <span className="text-muted">Last dose</span>
            <span className="text-text">
              {latestDose
                ? `${compoundById(latestDose.compoundId)?.displayName ?? "Dose"} · ${formatWhen(
                    latestDose.at,
                  )}`
                : "—"}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted">Latest weight</span>
            <span className="text-text">
              {latestWeight ? `${latestWeight.weightKg} kg` : "—"}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted">Recent side effect</span>
            <span className="text-text">
              {latestEffect
                ? `${latestEffect.type.replace(/_/g, " ")} (${latestEffect.severity}/3)`
                : "—"}
            </span>
          </li>
        </ul>
      </Card>

      <p className="text-center text-xs text-muted">
        {mode === "compounded" ? "Compounded mode" : "Prescribed mode"} ·{" "}
        <button type="button" onClick={clearMode} className="underline">
          Change
        </button>
      </p>
    </div>
  );
}
