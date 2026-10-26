// Seed, sprout or flame with the day's weather on it (SPEC 4.2). Animated by the page loop.
import { useId, useLayoutEffect, useMemo, useRef } from "react";
import type { IconSpec } from "../../lib/today-view";
import { registerIcon, type IconEls } from "../../scenes/streakIcons";
import { useTheme } from "../../theme/ThemeProvider";

export default function StreakIcon({ spec: specIn, phase }: { spec: IconSpec; phase: number }) {
  // Stable while its fields are unchanged, so the icon does not re-register on every store change.
  const specKey = JSON.stringify(specIn);
  const spec = useMemo(() => JSON.parse(specKey) as IconSpec, [specKey]);
  const th = useTheme();
  const gid = `fl-${useId().replace(/:/g, "")}`;
  const els = useRef<IconEls>({ seed: null, sprout: null, flame: null, core: null, drop: null, flake: null, spark: null, bolt: null, cloud: null });
  // Layout effect: children register before the parent's frozen-frame redraw (also a layout effect).
  useLayoutEffect(() => registerIcon({ els: els.current, spec, phase }), [spec, phase]);
  const refs = useMemo(() => {
    const make = <K extends keyof IconEls>(k: K) => (el: IconEls[K]) => {
      els.current[k] = el;
    };
    return { seed: make("seed"), sprout: make("sprout"), flame: make("flame"), core: make("core"), drop: make("drop"), flake: make("flake"), spark: make("spark"), bolt: make("bolt"), cloud: make("cloud") };
  }, []);
  const r = <K extends keyof IconEls>(k: K) => refs[k];
  const fx = th.fx;
  return (
    <svg data-testid="streak-icon" data-kind={spec.kind} width="18" height="20" viewBox="0 0 18 20" aria-hidden="true" style={{ overflow: "visible", filter: spec.kind === "flame" ? fx.flameFilter : "none" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fx.flameTop} />
          <stop offset="1" stopColor={fx.flameBottom} />
        </linearGradient>
      </defs>
      {spec.kind === "seed" && <ellipse ref={r("seed")} cx="9" cy="15.5" rx="2.6" ry="1.9" fill={th.t.muted} />}
      {spec.kind === "sprout" && (
        <g ref={r("sprout")}>
          <path d="M9 18V10.5M9 10.5C9 7.6 7 6 4.2 6C4.2 8.9 6.2 10.5 9 10.5ZM9 13C9 10.5 10.9 8.8 13.6 8.8C13.6 11.3 11.7 13 9 13Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {spec.kind === "flame" && (
        <g ref={r("flame")}>
          <path d="M9 2.5C10.2 5.2 13.8 6.8 13.8 11.2C13.8 14.6 11.6 18 9 18C6.4 18 4.2 14.6 4.2 11.6C4.2 9.2 5.6 7.8 6.6 6.8C6.8 8.6 7.6 9.6 8.6 10C8.8 7.2 7.8 5.2 9 2.5Z" fill={`url(#${gid})`} />
          <path ref={r("core")} d="M9 9.5C9.8 11 11.4 12 11.4 14.2C11.4 16.2 10.3 17.6 9 17.6C7.7 17.6 6.6 16.3 6.6 14.6C6.6 13.2 7.4 12.4 8 11.8C8.1 12.9 8.6 13.4 9.2 13.6C9.4 12.2 8.6 10.9 9 9.5Z" fill={fx.flameCore} />
        </g>
      )}
      {spec.drop && <path data-testid="icon-drop" ref={r("drop")} d="M0 -3C1 -1.5 1.6 -0.4 1.6 0.6A1.6 1.6 0 0 1 -1.6 0.6C-1.6 -0.4 -1 -1.5 0 -3Z" fill={fx.drop} opacity="0" />}
      {spec.flake && <path data-testid="icon-flake" ref={r("flake")} d="M0 -2.4V2.4M-2.1 -1.2L2.1 1.2M-2.1 1.2L2.1 -1.2" fill="none" stroke={fx.flake} strokeWidth="1.1" strokeLinecap="round" opacity="0" />}
      {spec.spark && <path data-testid="icon-spark" ref={r("spark")} d="M0 -3L0.8 -0.8L3 0L0.8 0.8L0 3L-0.8 0.8L-3 0L-0.8 -0.8Z" fill={fx.sparkIcon} transform="translate(15 3.5) scale(0)" />}
      {spec.bolt && <path data-testid="icon-bolt" ref={r("bolt")} d="M1 -4L-1.6 0.4H0.6L-0.8 4L2 -0.6H-0.2Z" fill={fx.sparkIcon} transform="translate(15.5 5)" opacity="0" />}
      {spec.cloud && <path data-testid="icon-cloud" ref={r("cloud")} d="M-3 1.2H3.4A1.8 1.8 0 0 0 3 -2.2A2.6 2.6 0 0 0 -2 -1.6A1.6 1.6 0 0 0 -3 1.2Z" fill={fx.cloud} transform="translate(12 3.5)" />}
    </svg>
  );
}
