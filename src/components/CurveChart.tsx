import type { CurvePoint } from "../lib/pk";

/**
 * CurveChart — shared presentational SVG for the medication-level curve (PRD §7.1).
 * Consumes the core's CurvePoint[] ({tHours, level}). Colors via theme tokens.
 */
const W = 340;
const H = 190;
const PAD = { l: 10, r: 10, t: 14, b: 20 };

export function CurveChart({ points }: { points: CurvePoint[] }) {
  if (points.length < 2) return null;
  const plot = { x: PAD.l, y: PAD.t, w: W - PAD.l - PAD.r, h: H - PAD.t - PAD.b };
  const t0 = points[0].tHours;
  const t1 = Math.max(points[points.length - 1].tHours, t0 + 1);
  const yMax = Math.max(1e-9, ...points.map((p) => p.level));
  const sx = (t: number) => plot.x + ((t - t0) / (t1 - t0)) * plot.w;
  const sy = (lvl: number) => plot.y + plot.h - (lvl / yMax) * plot.h;
  const line = points.map((p) => `${sx(p.tHours)},${sy(p.level)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Relative medication level over time"
    >
      <line
        x1={plot.x}
        y1={plot.y + plot.h}
        x2={plot.x + plot.w}
        y2={plot.y + plot.h}
        style={{ stroke: "var(--color-border)" }}
        strokeWidth={1}
      />
      <polyline
        points={line}
        fill="none"
        style={{ stroke: "var(--color-accent)" }}
        strokeWidth={1.8}
      />
      <circle
        cx={sx(last.tHours)}
        cy={sy(last.level)}
        r={3}
        style={{ fill: "var(--color-accent)" }}
      />
      <text x={plot.x} y={H - 4} fontSize={7} style={{ fill: "var(--color-muted)" }}>
        start
      </text>
      <text
        x={plot.x + plot.w}
        y={H - 4}
        textAnchor="end"
        fontSize={7}
        style={{ fill: "var(--color-muted)" }}
      >
        now
      </text>
    </svg>
  );
}
