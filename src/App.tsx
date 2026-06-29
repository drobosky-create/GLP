import { useEffect } from "react";
import { useAppStore } from "./state/store";
import { TabBar } from "./components/TabBar";
import { Home } from "./screens/Home/Home";
import { Log } from "./screens/Log/Log";
import { Weight } from "./screens/Weight/Weight";
import { Effects } from "./screens/Effects/Effects";
import { InjectionSite } from "./screens/InjectionSite/InjectionSite";
import { Report } from "./screens/Report/Report";
import { Muscle } from "./screens/Muscle/Muscle";
import { Curve } from "./screens/Curve/Curve";
import { Reminders } from "./screens/Reminders/Reminders";
import { Paywall } from "./screens/Paywall/Paywall";
import { Reconstitution } from "./screens/Reconstitution/Reconstitution";
import { Vials } from "./screens/Vials/Vials";
import { Library } from "./screens/Library/Library";
import { Stacks } from "./screens/Stacks/Stacks";
import { Education } from "./screens/Education/Education";
import { Onboarding } from "./screens/Onboarding/Onboarding";
import { Photos } from "./screens/Photos/Photos";

/** Root shell: hydrate local data once, then render the active screen + tab bar. */
export function App() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);
  const mode = useAppStore((s) => s.mode);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col">
        <main className="flex-1 p-4">
          <p className="text-sm text-muted">Loading…</p>
        </main>
      </div>
    );
  }

  // First run (PRD §2): route through onboarding before the app shell.
  if (mode === null) {
    return <Onboarding />;
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1 p-4">
        {screen === "home" ? (
          <Home />
        ) : screen === "dose" ? (
          <Log />
        ) : screen === "weight" ? (
          <Weight />
        ) : screen === "effects" ? (
          <Effects />
        ) : screen === "sites" ? (
          <InjectionSite />
        ) : screen === "report" ? (
          <Report />
        ) : screen === "muscle" ? (
          <Muscle />
        ) : screen === "curve" ? (
          <Curve />
        ) : screen === "reminders" ? (
          <Reminders />
        ) : screen === "recon" ? (
          <Reconstitution />
        ) : screen === "vials" ? (
          <Vials />
        ) : screen === "library" ? (
          <Library />
        ) : screen === "stacks" ? (
          <Stacks />
        ) : screen === "education" ? (
          <Education />
        ) : screen === "photos" ? (
          <Photos />
        ) : (
          <Paywall />
        )}
      </main>
      <TabBar active={screen} onSelect={setScreen} />
    </div>
  );
}
