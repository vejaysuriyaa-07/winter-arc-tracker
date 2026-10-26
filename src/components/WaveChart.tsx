import { useEffect, useId, useRef, useState } from "react";
import { catmullRomPath } from "../lib/curve";
import { formatMonthDay } from "../lib/dates";
import { prefersReducedMotion } from "../lib/motion";
import type { DayPoint } from "../lib/stats";

type Props = { points: readonly DayPoint[] };

const W = 340;
const H = 150;
const PAD = { top: 14, right: 12, bottom: 22, left: 12 };

export default function WaveChart({ points }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const lineRef = useRef<SVGPathElement | null>(null);
  const gradId = useId();
  const n = points.length;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const xs = points.map((_, i) => (n === 1 ? PAD.left + innerW / 2 : PAD.left + (i / (n - 1)) * innerW));
  const ys = points.map((p) => PAD.top + innerH - (p.percent / 100) * innerH);
  const pts = points.map((_, i) => ({ x: Number(xs[i]!.toFixed(2)), y: Number(ys[i]!.toFixed(2)) }));
  const line = catmullRomPath(pts);
  const baseline = PAD.top + innerH;
  const area = n > 0 ? `${line} L${pts[n - 1]!.x},${baseline} L${pts[0]!.x},${baseline} Z` : "";

  // Draw the line on mount: stroke-dashoffset from its length to 0, ~1s.
  useEffect(() => {
    const el = lineRef.current;
    if (!el || n < 2) return;
    const len = el.getTotalLength();
    if (prefersReducedMotion()) {
      el.style.strokeDasharray = "";
      el.style.strokeDashoffset = "0";
      return;
    }
    el.style.transition = "none";
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    // Flush the hidden state before the transition starts, or both writes land in one style pass.
    void el.getBoundingClientRect();
    const raf = requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 1s ease-out";
      el.style.strokeDashoffset = "0";
    });
    return () => cancelAnimationFrame(raf);
  }, [line, n]);

  function pick(clientX: number, el: SVGSVGElement): void {
    if (n === 0) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(xs[i]! - x) < Math.abs(xs[best]! - x)) best = i;
    setActive(best);
  }

  const a = active !== null ? points[active] : undefined;

  return (
    <div className="relative" data-testid="wave-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label="Daily completion across the arc"
        onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map((g) => {
          const y = PAD.top + innerH - (g / 100) * innerH;
          return (
            <g key={g}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#1F2A25" strokeWidth="1" />
              <text x={W - PAD.right} y={y - 3} textAnchor="end" fontSize="8" fill="#5B6E63">
                {g}%
              </text>
            </g>
          );
        })}
        {n > 1 && <path d={area} fill={`url(#${gradId})`} />}
        {n > 1 && (
          <path ref={lineRef} d={line} fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map((p, i) => {
          const x = pts[i]!.x;
          const y = pts[i]!.y;
          const isActive = active === i;
          if (p.isToday) {
            return (
              <g key={p.date} data-testid="marker" data-date={p.date} data-kind="today">
                <circle cx={x} cy={y} r={isActive ? 6 : 4.5} fill="#0A0F0D" stroke="#F5B83D" strokeWidth="2" />
                <circle cx={x} cy={y} r="1.6" fill="#F5B83D" />
              </g>
            );
          }
          if (!p.logged) {
            return (
              <g key={p.date} data-testid="marker" data-date={p.date} data-kind="unlogged">
                <circle cx={x} cy={y} r={isActive ? 5 : 3.5} fill="#0A0F0D" stroke="#5B6E63" strokeWidth="1.5" strokeDasharray="2 1.5" />
              </g>
            );
          }
          return (
            <g key={p.date} data-testid="marker" data-date={p.date} data-kind="logged">
              <circle cx={x} cy={y} r={isActive ? 5 : 3} fill={p.percent >= 100 ? "#F5B83D" : "#22C55E"} />
            </g>
          );
        })}
        {n > 0 && (
          <>
            <text x={pts[0]!.x} y={H - 6} fontSize="9" fill="#8EA396" textAnchor="start">
              {formatMonthDay(points[0]!.date)}
            </text>
            {n > 1 && (
              <text x={pts[n - 1]!.x} y={H - 6} fontSize="9" fill="#8EA396" textAnchor="end">
                {formatMonthDay(points[n - 1]!.date)}
              </text>
            )}
          </>
        )}
      </svg>
      <div
        className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-line bg-bg px-2 py-1 text-xs ${
          a ? "opacity-100" : "opacity-0"
        }`}
        data-testid="chart-tooltip"
      >
        {a && (
          <>
            <span className="text-muted">{formatMonthDay(a.date)}</span>{" "}
            <span className="num font-bold">{a.logged ? `${Math.round(a.percent)}%` : "not logged"}</span>
            {a.isToday && <span className="text-gold"> · in progress</span>}
          </>
        )}
      </div>
    </div>
  );
}
