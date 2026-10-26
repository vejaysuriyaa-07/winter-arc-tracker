// Small shared pieces for Progress, Month and Plant detail.
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Season } from "../../types";
import { plantShape, SCENE_PALETTES } from "../../lib/garden";
import { useTheme } from "../../theme/ThemeProvider";
import { radioKeys } from "../ui/useRadioKeys";

export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const th = useTheme();
  const keys = radioKeys(options.map((o) => o.value), value, onChange);
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={keys.onKeyDown} className="grid p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, borderRadius: 14, background: th.isNight ? "#1A1E17" : th.t.surface, boxShadow: `0 0 0 1px ${th.t.line}` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} tabIndex={keys.tabIndex(o.value)} onClick={() => onChange(o.value)} className="h-10 text-[15px] font-semibold" style={{ borderRadius: 10, background: on ? th.accentGradient : "transparent", color: on ? th.t.onAccent : th.t.muted, transition: "background 200ms" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tile({ label, value, unit, testId }: { label: string; value: string; unit?: string; testId?: string }) {
  const th = useTheme();
  return (
    <div className="card flex flex-col gap-1 p-3.5">
      <span className="text-[13px]" style={{ color: th.t.muted }}>{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="num text-[28px] leading-none" data-testid={testId} style={{ fontFamily: th.t.fonts.display }}>{value}</span>
        {unit && <span className="text-[13px]" style={{ color: th.t.muted }}>{unit}</span>}
      </span>
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const th = useTheme();
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-[22px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>{children}</h2>
      {aside && <span className="text-[13px]" style={{ color: th.t.muted }}>{aside}</span>}
    </div>
  );
}

export function RowLink({ to, title, detail, testId }: { to: string; title: string; detail?: string; testId?: string }) {
  const th = useTheme();
  return (
    <Link to={to} data-testid={testId} className="card flex min-h-14 items-center justify-between gap-3 px-4">
      <span className="flex flex-col">
        <span className="text-[16px] font-medium">{title}</span>
        {detail && <span className="text-[13px]" style={{ color: th.t.muted }}>{detail}</span>}
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={th.t.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6L15 12L9 18" /></svg>
    </Link>
  );
}

/** A plant drawn with the garden's own geometry, sized by growth. */
export function MiniPlant({ g, wilt, season, size = 40 }: { g: number; wilt: boolean; season: Season; size?: number }) {
  const pal = SCENE_PALETTES[season];
  const p = plantShape(Math.max(g, 0.02), wilt, pal.pine, pal);
  return (
    <svg width={size} height={size} viewBox="0 0 120 160" aria-hidden="true" style={{ overflow: "visible", transform: wilt ? "rotate(9deg)" : undefined, transformOrigin: "50% 100%" }}>
      <ellipse cx="60" cy="157" rx={p.moundRx} ry="4" fill={pal.mound} />
      <path d={p.trunk} fill="none" stroke={p.trunkColor} strokeWidth={p.trunkW} strokeLinecap="round" />
      <path d={p.sprout} fill={pal.stem} />
      <g opacity={p.canopyOp}>
        <circle cx={p.c2x} cy={p.c2y} r={p.r2} fill={p.leafB} />
        <circle cx={p.c3x} cy={p.c3y} r={p.r3} fill={p.leafA} />
        <circle cx="60" cy={p.c1y} r={p.r1} fill={p.leafA} />
        <circle cx={p.c4x} cy={p.c4y} r={p.r4} fill={p.leafB} />
        <path d={p.t1} fill={p.leafA} />
        <path d={p.t2} fill={p.leafB} />
        <path d={p.t3} fill={p.leafA} />
        <path d={p.cap} fill="#F8FAFC" />
      </g>
    </svg>
  );
}

export function Bar({ value, strong }: { value: number; strong?: boolean }) {
  const th = useTheme();
  return (
    <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full" style={{ background: th.progressTrack }}>
      <span className="block h-full rounded-full" style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, background: th.progressFill, opacity: strong === false ? 0.55 : 1 }} />
    </span>
  );
}
