import { useEffect } from "react";
import { useAppStore } from "./state/store";
import { TabBar } from "./components/TabBar";
import { Home } from "./screens/Home/Home";
import { Log } from "./screens/Log/Log";
import { Weight } from "./screens/Weight/Weight";
import { Effects } from "./screens/Effects/Effects";
import { InjectionSite } from "./screens/InjectionSite/InjectionSite";
import { Report } from "./screens/Report/Report";
import { Reminders } from "./screens/Reminders/Reminders";

/** Root shell: hydrate local data once, then render the active screen + tab bar. */
export function App() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1 p-4">
        {!hydrated ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : screen === "home" ? (
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
        ) : (
          <Reminders />
        )}
      </main>
      <TabBar active={screen} onSelect={setScreen} />
    </div>
  );
}
