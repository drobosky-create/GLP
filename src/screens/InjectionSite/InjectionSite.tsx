import { useAppStore } from "../../state/store";
import { Button, Card } from "../../components/Form";
import { BodyMap } from "../../components/BodyMap";
import { INJECTION_SITES, siteUsage, suggestNextSite } from "./sites";

/** Injection-site rotation map (MVP §3 item 2) — visual map + "where next". */
export function InjectionSite() {
  const doseEvents = useAppStore((s) => s.doses);
  const setScreen = useAppStore((s) => s.setScreen);

  const usage = siteUsage(doseEvents);
  const suggestedId = suggestNextSite(doseEvents);
  const suggested = INJECTION_SITES.find((s) => s.id === suggestedId);

  return (
    <div className="flex flex-col gap-4">
      <Card title="Rotation map">
        <p className="mb-3 text-sm text-muted">
          {suggested
            ? `Based on your logged sites, ${suggested.region.toLowerCase()} (${suggested.side.toLowerCase()}) is next in your rotation.`
            : "Log a dose with an injection site to start tracking rotation."}
        </p>
        <BodyMap usage={usage} suggestedId={suggestedId} />
      </Card>

      <Button onClick={() => setScreen("dose")}>Log a dose</Button>
    </div>
  );
}
