import type { ReportModel } from "../lib/report";

/**
 * ReportChart — shared presentational SVG (PRD §7.1: presentational only). Consumes
 * the core ReportModel: weight trend line + vertical markers at dose increases.
 * Colors reference theme.css tokens via CSS vars (no raw hex — §13).
 */
const W = 340;
const H = 200;
const PAD = { l: 30, r: 12, t: 14, b: 24 };

export function ReportChart({ model }: { model: ReportModel }) {
  const pts = model.weight.points;
  const plot = { x: PAD.l, y: PAD.t, w: W - PAD.l - PAD.r, h: H - PAD.t - PAD.b };
  const t0 = model.periodStart;
  const t1 = Math.max(model.periodEnd, model.periodStart + 1);
  const tSpan = t1 - t0;
  const sx = (t: number) => plot.x + ((t - t0) / tSpan) * plot.w;

  const kgs = pts.map((p) => p.kg);
  const kgMin = kgs.length ? Math.min(...kgs) : 0;
  const kgMax = kgs.length ? Math.max(...kgs) : 1;
  const kgSpan = Math.max(1e-6, kgMax - kgMin);
  const sy = (kg: number) => plot.y + plot.h - ((kg - kgMin) / kgSpan) * plot.h;

  const line = pts.map((p) => `${sx(p.at)},${sy(p.kg)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Weight trend with dose-increase markers"
    >
      <line
        x1={plot.x}
        y1={plot.y + plot.h}
        x2={plot.x + plot.w}
        y2={plot.y + plot.h}
        style={{ stroke: "var(--color-border)" }}
        strokeWidth={1}
      />

      {/* dose-increase markers */}
      {model.doseIncreases.map((inc, i) => (
        <line
          key={i}
          x1={sx(inc.at)}
          y1={plot.y}
          x2={sx(inc.at)}
          y2={plot.y + plot.h}
          style={{ stroke: "var(--color-accent)" }}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      ))}

      {/* weight trend */}
      {pts.length > 1 ? (
        <polyline
          points={line}
          fill="none"
          style={{ stroke: "var(--color-accent-alt)" }}
          strokeWidth={1.8}
        />
      ) : null}
      {pts.map((p, i) => (
        <circle
          key={`p${i}`}
          cx={sx(p.at)}
          cy={sy(p.kg)}
          r={2}
          style={{ fill: "var(--color-accent-alt)" }}
        />
      ))}
    </svg>
  );
}
