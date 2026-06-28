import type { CurveModel } from "../lib/pk";

/**
 * CurveChart — shared presentational SVG for the medication-level curve (PRD §7.1:
 * presentational only). Plots the relative level over time with dose markers and a
 * steady-state guide. Colors reference theme.css tokens via CSS vars (no raw hex).
 */
const W = 340;
const H = 200;
const PAD = { l: 10, r: 10, t: 14, b: 22 };

export function CurveChart({ model }: { model: CurveModel }) {
  if (!model.hasData || model.startT == null || model.points.length < 2) {
    return null;
  }
  const plot = {
    x: PAD.l,
    y: PAD.t,
    w: W - PAD.l - PAD.r,
    h: H - PAD.t - PAD.b,
  };
  const t0 = model.startT;
  const t1 = model.nowT;
  const tSpan = Math.max(1, t1 - t0);
  const yMax = Math.max(1e-9, model.peakLevel);
  const sx = (t: number) => plot.x + ((t - t0) / tSpan) * plot.w;
  const sy = (lvl: number) => plot.y + plot.h - (lvl / yMax) * plot.h;

  const linePoints = model.points
    .map((p) => `${sx(p.t)},${sy(p.level)}`)
    .join(" ");

  const showSteady =
    model.steadyStateT != null &&
    model.steadyStateT >= t0 &&
    model.steadyStateT <= t1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Relative medication level over time"
    >
      {/* baseline */}
      <line
        x1={plot.x}
        y1={plot.y + plot.h}
        x2={plot.x + plot.w}
        y2={plot.y + plot.h}
        style={{ stroke: "var(--color-border)" }}
        strokeWidth={1}
      />

      {/* dose markers */}
      {model.doseTimes.map((t, i) => (
        <line
          key={`d${i}`}
          x1={sx(t)}
          y1={plot.y}
          x2={sx(t)}
          y2={plot.y + plot.h}
          style={{ stroke: "var(--color-border)" }}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      ))}

      {/* steady-state guide */}
      {showSteady && model.steadyStateT != null ? (
        <line
          x1={sx(model.steadyStateT)}
          y1={plot.y}
          x2={sx(model.steadyStateT)}
          y2={plot.y + plot.h}
          style={{ stroke: "var(--color-success)" }}
          strokeWidth={1}
        />
      ) : null}

      {/* level curve */}
      <polyline
        points={linePoints}
        fill="none"
        style={{ stroke: "var(--color-accent)" }}
        strokeWidth={1.8}
      />

      {/* current level dot */}
      <circle
        cx={sx(model.nowT)}
        cy={sy(model.currentLevel)}
        r={3}
        style={{ fill: "var(--color-accent)" }}
      />

      <text
        x={plot.x}
        y={H - 6}
        fontSize={7}
        style={{ fill: "var(--color-muted)" }}
      >
        start
      </text>
      <text
        x={plot.x + plot.w}
        y={H - 6}
        textAnchor="end"
        fontSize={7}
        style={{ fill: "var(--color-muted)" }}
      >
        now
      </text>
    </svg>
  );
}
