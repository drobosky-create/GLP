import { Logo } from "../../components/Logo";
import { Button, Card, formatWhen } from "../../components/Form";
import { useAppStore } from "../../state/store";

/**
 * Home — dashboard summarizing the user's OWN logged data and offering quick paths
 * to each log screen. Copy is neutral (PRD §1.5): it describes data, recommends
 * nothing. All values come from theme tokens (§13).
 */
export function Home() {
  const setScreen = useAppStore((s) => s.setScreen);
  const doseEvents = useAppStore((s) => s.doseEvents);
  const weightEntries = useAppStore((s) => s.weightEntries);
  const sideEffects = useAppStore((s) => s.sideEffects);

  const latestWeight = weightEntries[0];
  const latestDose = doseEvents[0];
  const latestEffect = sideEffects[0];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Logo size={40} className="text-accent" />
        <div className="flex flex-col">
          <h1 className="font-display text-xl font-semibold text-text">
            GLP-1 Companion
          </h1>
          <p className="text-xs text-muted">Your journey, in your own data.</p>
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

      <Card title="At a glance">
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex justify-between">
            <span className="text-muted">Last dose</span>
            <span className="text-text">
              {latestDose
                ? `${latestDose.dose} ${latestDose.doseUnit} · ${formatWhen(
                    latestDose.datetime,
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
                ? `${latestEffect.type} (${latestEffect.severity}/10)`
                : "—"}
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
