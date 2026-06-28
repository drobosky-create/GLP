import { layoutChart, type ReportModel } from "../lib/report";

/**
 * ReportChart — shared presentational SVG chart (PRD §7.1: presentational only).
 * Renders from the SAME layoutChart geometry the PDF uses, so screen and export
 * match. Colors reference theme.css tokens via CSS vars (no raw hex — §13).
 */
const W = 340;
const H = 210;

export function ReportChart({ model }: { model: ReportModel }) {
  const c = layoutChart(model, W, H);
  const toPoints = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Dose, weight, and side-effect timeline"
    >
      {/* plot frame */}
      <rect
        x={c.plot.x}
        y={c.plot.y}
        width={c.plot.w}
        height={c.plot.h}
        fill="none"
        style={{ stroke: "var(--color-border)" }}
        strokeWidth={1}
      />

      {/* dose tick labels (left) */}
      {c.doseTicks.map((t, i) => (
        <text
          key={`d${i}`}
          x={c.plot.x - 4}
          y={t.y + 3}
          textAnchor="end"
          fontSize={7}
          style={{ fill: "var(--color-muted)" }}
        >
          {t.label}
        </text>
      ))}

      {/* x tick labels */}
      {c.xTicks.map((t, i) => (
        <text
          key={`x${i}`}
          x={t.x}
          y={c.plot.y + c.plot.h + 12}
          textAnchor="middle"
          fontSize={7}
          style={{ fill: "var(--color-muted)" }}
        >
          {t.label}
        </text>
      ))}

      {/* dose step */}
      {c.doseStep.length > 1 ? (
        <polyline
          points={toPoints(c.doseStep)}
          fill="none"
          style={{ stroke: "var(--color-accent)" }}
          strokeWidth={1.6}
        />
      ) : null}

      {/* weight line */}
      {c.weightLine.length > 1 ? (
        <polyline
          points={toPoints(c.weightLine)}
          fill="none"
          style={{ stroke: "var(--color-accent-alt)" }}
          strokeWidth={1.6}
        />
      ) : null}

      {/* effect markers */}
      {c.effects.map((e, i) => (
        <circle
          key={`e${i}`}
          cx={e.x}
          cy={e.y}
          r={e.r}
          style={{ fill: "var(--color-danger)" }}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}
