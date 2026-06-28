import { Logo } from "../../components/Logo";

/**
 * Home — Phase 0 boots to this (intentionally empty) screen on web.
 * All visual values come from theme.css tokens (PRD §13): no raw hex / font / magic
 * spacing here. Copy is neutral (§1.5) — it describes the tool, recommends nothing.
 */
export function Home() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <Logo size={56} className="text-accent" />
      <h1 className="font-display text-2xl font-semibold text-text">
        GLP-1 Companion
      </h1>
      <p className="max-w-sm text-sm text-muted">
        A neutral logging and calculation tool for your own GLP-1 journey.
        Logging, your doctor report, and muscle-preservation tracking arrive in
        the next phases.
      </p>
    </main>
  );
}
