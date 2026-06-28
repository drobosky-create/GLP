import { useEffect, useState } from "react";
import { useAppStore } from "../../state/store";
import type { Plan } from "../../state/store";
import { Button, Card } from "../../components/Form";

// What premium unlocks (the §6 paywall set). Items not yet built are labeled.
const PREMIUM_FEATURES = [
  "Correlation report & one-page PDF export",
  "Muscle-preservation module (coming soon)",
  "Medication-level curve (coming soon)",
  "Photo progress (coming soon)",
];

/** Paywall (Phase 4) — mandatory 7-day trial + dual purchase channels (§6). */
export function Paywall() {
  const plans = useAppStore((s) => s.plans);
  const premium = useAppStore((s) => s.premium);
  const trialDaysLeft = useAppStore((s) => s.trialDaysLeft);
  const entitlement = useAppStore((s) => s.entitlement);
  const startTrial = useAppStore((s) => s.startTrial);
  const openCheckout = useAppStore((s) => s.openCheckout);
  const purchaseViaStore = useAppStore((s) => s.purchaseViaStore);
  const restorePurchases = useAppStore((s) => s.restorePurchases);
  const recompute = useAppStore((s) => s.recomputeEntitlement);
  const setScreen = useAppStore((s) => s.setScreen);

  const [planId, setPlanId] = useState<Plan["id"]>("annual");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    recompute();
  }, [recompute]);

  const onStartTrial = async () => {
    await startTrial();
    setNote("Your 7-day free trial is active.");
  };
  const onWeb = async () => setNote((await openCheckout(planId)).reason);
  const onStore = async () => setNote((await purchaseViaStore(planId)).reason);
  const onRestore = async () => setNote((await restorePurchases()).reason);

  const onTrial = entitlement?.tier === "trial";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          Go Premium
        </h1>
        <p className="text-xs text-muted">
          Unlock the analytics. Your logging and reminders are always free.
        </p>
      </header>

      {premium ? (
        <Card>
          <p className="text-sm text-success">
            {onTrial && trialDaysLeft != null
              ? `Trial active — ${trialDaysLeft} day${
                  trialDaysLeft === 1 ? "" : "s"
                } left.`
              : "Premium is active. Thank you!"}
          </p>
        </Card>
      ) : null}

      <Card title="What's included">
        <ul className="flex flex-col gap-2 text-sm text-text">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-accent">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Choose a plan">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {plans.map((p) => {
              const active = p.id === planId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`flex flex-col items-start rounded-md border p-3 text-left ${
                    active
                      ? "border-accent bg-accent text-on-accent"
                      : "border-border bg-surface text-text"
                  }`}
                >
                  <span className="font-display text-sm">{p.label}</span>
                  <span
                    className={`text-sm ${active ? "text-on-accent" : "text-text"}`}
                  >
                    {p.priceLabel}
                  </span>
                  <span
                    className={`text-xs ${active ? "text-on-accent" : "text-muted"}`}
                  >
                    {p.cadence}
                  </span>
                </button>
              );
            })}
          </div>

          {!premium ? (
            <Button onClick={onStartTrial}>Start 7-day free trial</Button>
          ) : null}

          {/* Dual paywall — both channels shown (§6). */}
          <Button variant="ghost" onClick={onWeb}>
            Continue on web (Stripe)
          </Button>
          <Button variant="ghost" onClick={onStore}>
            Buy in app
          </Button>
          <Button variant="ghost" onClick={onRestore}>
            Restore purchase
          </Button>

          <p className="text-xs text-muted">
            No charge until you confirm in checkout. Cancel anytime — no surprise
            renewals.
          </p>
          {note ? <p className="text-xs text-text">{note}</p> : null}
        </div>
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
