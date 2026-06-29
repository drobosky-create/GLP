import { Logo } from "../../components/Logo";
import { Card } from "../../components/Form";
import { useAppStore } from "../../state/store";

/**
 * Onboarding (PRD §2) — the one routing question: prescribed brand vs compounded/
 * self-administered. Sets the app mode (persisted), which tailors the catalog and
 * unlocks compounded modules. Shown only on first run (while mode is unset).
 *
 * Neutral: it asks how the user is dosing; it recommends nothing. The compounded
 * path stays behind the legal-review flag (compoundedEnabled) until cleared (§9).
 */
export function Onboarding() {
  const setMode = useAppStore((s) => s.setMode);
  const compoundedEnabled = useAppStore((s) => s.compoundedEnabled);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5 p-6">
      <header className="flex items-center gap-3">
        <Logo size={40} />
        <div className="flex flex-col">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text">
            Tally
          </h1>
          <p className="text-xs text-muted">Track. Log. Report.</p>
        </div>
      </header>

      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold text-text">
          How are you dosing?
        </h2>
        <p className="text-sm text-muted">
          This just tailors what you see — you can change it later. Tally never
          recommends a medication or protocol.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setMode("prescribed")}
        className="rounded-lg border border-border bg-surface p-4 text-left"
      >
        <span className="font-display text-base text-text">
          Prescribed brand medication
        </span>
        <span className="mt-1 block text-sm text-muted">
          A GLP-1 prescribed by your provider — Wegovy, Ozempic, Zepbound,
          Mounjaro, or an oral form.
        </span>
      </button>

      <button
        type="button"
        disabled={!compoundedEnabled}
        onClick={() => compoundedEnabled && setMode("compounded")}
        className="rounded-lg border border-border bg-surface p-4 text-left disabled:opacity-50"
      >
        <span className="font-display text-base text-text">
          Compounded or self-administered
        </span>
        <span className="mt-1 block text-sm text-muted">
          A compounded or self-administered protocol. Adds reconstitution and vial
          tools.
        </span>
        {!compoundedEnabled ? (
          <span className="mt-2 block text-xs text-warning">
            Available soon.
          </span>
        ) : null}
      </button>

      <Card>
        <p className="text-xs text-muted">
          Tally is a neutral logging and calculation tool. It describes your own
          data and never recommends a substance, dose, or change.
        </p>
      </Card>
    </div>
  );
}
