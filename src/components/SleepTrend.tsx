import { catmullRomPath } from "../lib/curve";
import type { SleepPoint } from "../lib/stats";

type Props = { series: readonly SleepPoint[] };

const W = 340;
const H = 70;
const PAD = 8;

/** Sparkline of the sleep score over arc days so far; gaps where a night has no score. */
export default function SleepTrend({ series }: Props) {
  const scored = series.flatMap((p, i) => (p.score === null ? [] : [{ score: p.score, i }]));
  const n = series.length;
  const x = (i: number) => (n <= 1 ? W / 2 : PAD + (i / (n - 1)) * (W - 2 * PAD));
  const y = (s: number) => PAD + (1 - s / 100) * (H - 2 * PAD);
  const pts = scored.map(({ score, i }) => ({ x: Number(x(i).toFixed(2)), y: Number(y(score).toFixed(2)) }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Sleep score trend" data-testid="sleep-trend">
      <line x1={PAD} x2={W - PAD} y1={y(50)} y2={y(50)} stroke="#1F2A25" />
      {pts.length > 1 && <path d={catmullRomPath(pts)} fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />}
      {pts.map((p, k) => (
        <circle key={k} cx={p.x} cy={p.y} r="3" fill="#22C55E" />
      ))}
    </svg>
  );
}
