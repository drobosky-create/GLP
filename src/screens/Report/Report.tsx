import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../state/store";
import { buildReport, type ReportModel } from "../../lib/report";
import { canAccess } from "../../lib/billing";
import { ReportChart } from "../../components/ReportChart";
import { Button, Card } from "../../components/Form";

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Thin PDF consumer of the core ReportModel (Core Integration Guide §report). */
async function exportReportPdf(model: ReportModel): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentW = pageW - margin * 2;
  const cText = token("--color-text");
  const cMuted = token("--color-muted");
  const cAlt = token("--color-accent-alt");
  const cAccent = token("--color-accent");
  const cBorder = token("--color-border");

  let y = 54;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(cText);
  doc.text("Tally — Progress Report", margin, y);

  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(cText);
  for (const line of model.summaryLines) {
    for (const w of doc.splitTextToSize(line, contentW) as string[]) {
      doc.text(`• ${w}`, margin, y);
      y += 15;
    }
  }

  // Simple weight chart with dose-increase markers.
  const pts = model.weight.points;
  if (pts.length > 0) {
    y += 12;
    const cx = margin;
    const cw = contentW;
    const ch = 150;
    doc.setDrawColor(cBorder);
    doc.rect(cx, y, cw, ch);
    const t0 = model.periodStart;
    const t1 = Math.max(model.periodEnd, t0 + 1);
    const kgs = pts.map((p) => p.kg);
    const kgMin = Math.min(...kgs);
    const kgMax = Math.max(...kgs);
    const kgSpan = Math.max(1e-6, kgMax - kgMin);
    const sx = (t: number) => cx + ((t - t0) / (t1 - t0)) * cw;
    const sy = (kg: number) => y + ch - ((kg - kgMin) / kgSpan) * ch;
    doc.setDrawColor(cAccent);
    for (const inc of model.doseIncreases) {
      doc.line(sx(inc.at), y, sx(inc.at), y + ch);
    }
    doc.setDrawColor(cAlt);
    doc.setLineWidth(1.4);
    for (let i = 1; i < pts.length; i++) {
      doc.line(sx(pts[i - 1].at), sy(pts[i - 1].kg), sx(pts[i].at), sy(pts[i].kg));
    }
    y += ch + 8;
    doc.setFontSize(8);
    doc.setTextColor(cMuted);
    doc.text("Weight (line) · dose increases (markers)", margin, y);
  }

  y += 22;
  doc.setFontSize(8);
  doc.setTextColor(cMuted);
  for (const w of doc.splitTextToSize(model.disclaimer, contentW) as string[]) {
    doc.text(w, margin, y);
    y += 12;
  }
  return doc.output("blob");
}

/** Correlation Report screen (PRD §4.1). Gated Pro via canAccess("report"). */
export function Report() {
  const doses = useAppStore((s) => s.doses);
  const weights = useAppStore((s) => s.weights);
  const sideEffects = useAppStore((s) => s.sideEffects);
  const entitlement = useAppStore((s) => s.entitlement);
  const setScreen = useAppStore((s) => s.setScreen);
  const [exporting, setExporting] = useState(false);

  const allowed = canAccess("report", entitlement);
  const canExport = canAccess("export", entitlement);

  const model = useMemo(
    () => buildReport(doses, weights, sideEffects),
    [doses, weights, sideEffects],
  );
  const hasData = doses.length + weights.length + sideEffects.length > 0;

  useEffect(() => {
    // no-op; entitlement is reactive from the store
  }, []);

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await exportReportPdf(model);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tally-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (!allowed) {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-semibold text-text">
            Correlation report
          </h1>
          <p className="text-xs text-muted">
            The report that maps side effects and weight against your dose
            timeline — the one to bring to your provider.
          </p>
        </header>
        <Card title="A premium feature">
          <p className="mb-3 text-sm text-muted">
            Your logging is free. The correlation report and one-page PDF export
            are part of Premium.
          </p>
          <Button onClick={() => setScreen("paywall")}>
            Start free trial to unlock
          </Button>
        </Card>
        <Button variant="ghost" onClick={() => setScreen("home")}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-semibold text-text">
          Correlation report
        </h1>
        <p className="text-xs text-muted">
          Your dose timeline, weight trend, and side-effect timing — from your own
          logs.
        </p>
      </header>

      <Card title="Summary">
        <ul className="flex flex-col gap-2 text-sm text-text">
          {model.summaryLines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Timeline">
        {hasData ? (
          <>
            <ReportChart model={model} />
            <p className="mt-2 text-xs text-muted">
              Weight (line) · dose increases (markers).
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">
            No data to chart yet. Log doses, weight, and side effects first.
          </p>
        )}
      </Card>

      <Button onClick={onExport} disabled={!hasData || !canExport || exporting}>
        {exporting ? "Preparing PDF…" : "Export one-page PDF"}
      </Button>

      <Card>
        <p className="text-xs text-muted">{model.disclaimer}</p>
      </Card>

      <Button variant="ghost" onClick={() => setScreen("home")}>
        Back to Home
      </Button>
    </div>
  );
}
