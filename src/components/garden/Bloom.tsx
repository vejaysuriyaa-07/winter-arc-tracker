// Today's bloom (docs/design/Bloom.dc.html): the compact petal flower in the
// habits header, the full-bloom moment over the garden, and the bloom chain card.
import { useEffect, useState } from "react";
import type { ChainDay } from "../../lib/stats";
import { weekdayShort } from "../../lib/dates";
import { GOLD, mix, rgba } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";

/** One petal per habit, filled when done; gold at full bloom. About 40px. */
export function BloomMini({ done, total }: { done: number; total: number }) {
  const th = useTheme();
  const n = Math.max(1, total);
  const full = total > 0 && done >= total;
  return (
    <svg data-testid="bloom-mini" data-done={done} data-total={total} width="40" height="40" viewBox="0 0 40 40" aria-label={`${done} of ${total} petals`} role="img">
      {Array.from({ length: n }, (_, i) => {
        const filled = i < done;
        // Teardrop petal from the centre outwards, the shape of the large bloom in Bloom.dc.html.
        const half = Math.max(2.6, Math.min(6, 30 / n));
        return (
          <path
            key={i}
            d={`M20 19C${20 - half} 15 ${20 - half} 5.5 20 3C${20 + half} 5.5 ${20 + half} 15 20 19Z`}
            transform={`rotate(${(360 / n) * i} 20 20)`}
            fill={full ? GOLD : filled ? th.accent : "transparent"}
            stroke={full ? GOLD : filled ? th.accent : th.t.ring}
            strokeWidth="1.2"
            strokeLinejoin="round"
            style={{ transition: "fill 300ms" }}
          />
        );
      })}
      <circle cx="20" cy="20" r="4.5" fill={full ? "#FFF3D1" : th.isNight ? "#1A1E17" : th.t.surface} stroke={full ? GOLD : th.t.ring} strokeWidth="1.2" />
    </svg>
  );
}

const BURST = Array.from({ length: 18 }, (_, i) => {
  const a = (2 * Math.PI * i) / 18 + (i % 2) * 0.12;
  const dist = 118 + (i % 3) * 14;
  return { x: Math.cos(a) * dist, y: Math.sin(a) * dist };
});

/** The large petal flower over the garden card: petals turn gold, particles burst, then it fades. */
export function FullBloom({ petals, onDone }: { petals: number; onDone: () => void }) {
  const th = useTheme();
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  useEffect(() => {
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setPhase(2));
    });
    const fade = setTimeout(() => setPhase(3), 1900);
    const end = setTimeout(onDone, 2500);
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      clearTimeout(fade);
      clearTimeout(end);
    };
  }, [onDone]);
  const n = Math.max(1, petals);
  const colors = [th.accent, GOLD, "#FFFFFF", mix(th.accent, "#FFFFFF", 0.5)];
  return (
    <div
      data-testid="full-bloom"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ background: `radial-gradient(circle, ${rgba(GOLD, phase === 3 ? 0 : 0.28)} 0%, rgba(0,0,0,0) 65%)`, opacity: phase === 3 ? 0 : 1, transition: "opacity 600ms ease-out, background 600ms" }}
    >
      <div className="relative h-[280px] w-[280px]" style={{ transform: `scale(${phase === 1 ? 0.7 : 1})`, transition: "transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
        {Array.from({ length: n }, (_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: 120, top: 34, width: 40, height: 106, transformOrigin: "50% 100%",
              transform: `rotate(${(360 / n) * i}deg) scale(${phase === 1 ? 1 : 1.06})`,
              transition: "transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1), background 480ms",
              borderRadius: "50% 50% 46% 46% / 62% 62% 38% 38%",
              background: phase === 1 ? `linear-gradient(180deg, ${mix(th.accent, "#FFFFFF", 0.3)} 0%, ${th.accent} 100%)` : `linear-gradient(180deg, #FFE7A3 0%, ${GOLD} 100%)`,
              boxShadow: "0 4px 14px -6px rgba(0, 0, 0, 0.35)",
            }}
          />
        ))}
        <div
          className="absolute flex flex-col items-center justify-center rounded-full"
          style={{
            left: 100, top: 100, width: 80, height: 80, border: `3px solid ${GOLD}`, background: "#FFF8E6", color: "#7A5208",
            transform: `scale(${phase === 2 ? 1.18 : 1})`, transition: "transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            fontFamily: th.t.fonts.display,
          }}
        >
          <span className="text-[22px] leading-none">Full</span>
          <span className="text-[13px]">bloom</span>
        </div>
        {BURST.map((b, i) => (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={{
              left: 136, top: 136, background: colors[i % colors.length],
              opacity: phase === 1 ? 1 : 0,
              transform: phase === 1 ? "translate(0, 0) scale(1)" : `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) scale(0.5)`,
              transition: phase === 1 ? "none" : "transform 1100ms cubic-bezier(0.16, 1, 0.3, 1), opacity 1100ms ease-out",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MiniFlower({ day }: { day: ChainDay }) {
  const th = useTheme();
  const petal =
    day.status === "full" || day.status === "kept" ? th.accent : day.status === "pending" ? "transparent" : rgba(th.t.muted, day.status === "none" ? 0.12 : 0.3);
  const center = day.status === "full" ? GOLD : day.status === "kept" ? mix(th.accent, "#FFFFFF", 0.4) : day.status === "pending" ? "transparent" : rgba(th.t.muted, 0.3);
  const stroke = day.status === "pending" ? th.t.ring : "none";
  const pos = [[17, 8.5], [24.6, 13.6], [21.7, 22.4], [12.3, 22.4], [9.4, 13.6]];
  return (
    <svg data-testid="chain-day" data-status={day.status} width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      {pos.map(([cx, cy]) => (
        <circle key={`${cx}`} cx={cx} cy={cy} r="4.2" fill={petal} stroke={stroke} strokeWidth="1" />
      ))}
      <circle cx="17" cy="16.5" r="3" fill={center} stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

/** Seven mini flowers for the last seven days, the chain length and a teaser line (SPEC 7.2). */
export function BloomChain({ days, chain, teaser }: { days: ChainDay[]; chain: number; teaser: string }) {
  const th = useTheme();
  return (
    <section aria-label="Bloom chain" data-testid="bloom-chain" className="card flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[20px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Bloom chain</h2>
        <span className="num text-[15px]" style={{ color: th.t.muted }}>
          <span data-testid="chain" style={{ color: th.t.text, fontWeight: 600 }}>{chain}</span> {chain === 1 ? "day" : "days"} kept in a row
        </span>
      </div>
      <div className="grid grid-cols-7 justify-items-center">
        {days.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1">
            <MiniFlower day={d} />
            <span className="text-[11px]" style={{ color: th.t.muted }}>{weekdayShort(d.date).slice(0, 1)}</span>
          </div>
        ))}
      </div>
      <p data-testid="chain-teaser" className="text-[14px]" style={{ color: th.accent }}>{teaser}</p>
    </section>
  );
}
