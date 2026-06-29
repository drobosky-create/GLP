import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAppStore } from "../../state/store";
import {
  accessLevel,
  buildPaywall,
  daysLeftInTrial,
  isEntitled,
  recordLinkAttribution,
  type PriceConfig,
} from "../../lib/billing";
import { Button, Card } from "../../components/Form";

const PRICES: PriceConfig = {
  webMonthlyDisplay: "$9.99/mo",
  webAnnualDisplay: "$59.99/yr",
  iapMonthlyDisplay: "$9.99/mo",
  iapAnnualDisplay: "$59.99/yr",
};

const PREMIUM_FEATURES = [
  "Correlation report & one-page PDF export",
  "Muscle-preservation module",
  "Medication-level curve",
  "Photo progress (coming soon)",
];

/** Paywall (Phase 4) — mandatory 7-day trial + dual purchase channels (§6). */
export function Paywall() {
  const entitlement = useAppStore((s) => s.entitlement);
  const startTrial = useAppStore((s) => s.startTrial);
  const setScreen = useAppStore((s) => s.setScreen);
  const [note, setNote] = useState("");

  const platform = Capacitor.getPlatform() as "ios" | "android" | "web";
  const options = buildPaywall(platform, PRICES);
  const level = accessLevel(entitlement);
  const premium = isEntitled(entitlement);
  const trialDays = daysLeftInTrial(entitlement);

  const onStartTrial = async () => {
    await startTrial();
    setNote("Your 7-day free trial is active.");
  };

  const onSubscribe = (channel: string) => {
    if (channel === "stripe_link") {
      recordLinkAttribution();
      const url = import.meta.env.VITE_STRIPE_CHECKOUT_URL as string | undefined;
      if (url) {
        window.open(url, "_blank", "noopener");
        setNote("Opened secure checkout in your browser.");
      } else {
        setNote("Checkout link not configured yet.");
      }
    } else {
      setNote("In-app purchase is available in the native app.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">Go Premium</h1>
        <p className="text-xs text-muted">
          Unlock the analytics. Your logging and reminders are always free.
        </p>
      </header>

      {premium ? (
        <Card>
          <p className="text-sm text-success">
            {level === "trial" && trialDays > 0
              ? `Trial active — ${trialDays} day${trialDays === 1 ? "" : "s"} left.`
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

      <Card title="Choose how to subscribe">
        <div className="flex flex-col gap-3">
          {!premium ? (
            <Button onClick={onStartTrial}>Start 7-day free trial</Button>
          ) : null}

          {options.map((opt) => (
            <div
              key={opt.channel}
              className="flex flex-col gap-1 rounded-md border border-border p-3"
            >
              <span className="font-display text-sm text-text">{opt.label}</span>
              <span className="text-sm text-text">
                {opt.monthlyDisplay} · {opt.annualDisplay}
              </span>
              <span className="text-xs text-muted">{opt.note}</span>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() => onSubscribe(opt.channel)}
              >
                {opt.channel === "stripe_link" ? "Continue on web" : "Buy in app"}
              </Button>
            </div>
          ))}

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
