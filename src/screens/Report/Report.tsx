import { useMemo, useState } from "react";
import { useAppStore } from "../../state/store";
import { buildReport, generateReportPdf } from "../../lib/report";
import { ReportChart } from "../../components/ReportChart";
import { Button, Card } from "../../components/Form";

/**
 * Report — the Correlation Report screen (PRD §4.1). Renders the neutral summary +
 * the timeline chart, and exports the one-page PDF. Copy carries no advice (Ref §5).
 */
export function Report() {
  const doseEvents = useAppStore((s) => s.doseEvents);
  const weightEntries = useAppStore((s) => s.weightEntries);
  const sideEffects = useAppStore((s) => s.sideEffects);
  const setScreen = useAppStore((s) => s.setScreen);
  const [exporting, setExporting] = useState(false);

  const model = useMemo(
    () => buildReport({ doseEvents, weightEntries, sideEffects }),
    [doseEvents, weightEntries, sideEffects],
  );

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await generateReportPdf(model);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "glp1-companion-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          Correlation report
        </h1>
        <p className="text-xs text-muted">
          Your dose timeline, weight trend, and side-effect severity — from your
          own logs.
        </p>
      </header>

      <Card title="Summary">
        <ul className="flex flex-col gap-2 text-sm text-text">
          {model.summary.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Timeline">
        {model.hasData ? (
          <>
            <ReportChart model={model} />
            <p className="mt-2 text-xs text-muted">
              Dose level (step) · Weight (line) · Side effect (marker; larger =
              higher severity).
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">
            No data to chart yet. Log doses, weight, and side effects first.
          </p>
        )}
      </Card>

      <Button onClick={onExport} disabled={!model.hasData || exporting}>
        {exporting ? "Preparing PDF…" : "Export one-page PDF"}
      </Button>

      <Card>
        <p className="text-xs text-muted">
          This report describes patterns in your own logged data. It isn’t medical
          advice and makes no dosing or treatment recommendation — discuss any
          changes with your provider.
        </p>
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
