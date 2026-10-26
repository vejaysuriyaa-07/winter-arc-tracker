// The Night look's living sky behind the page (docs/design/Skin.dc.html):
// 46 seeded twinkling stars and a drifting aurora glow that brighten as the
// day fills (`progress`) and flare when a habit is checked (flareNightSky()).
import { useRef } from "react";
import { rgba, rnd } from "../theme/tokens";
import { useMotionAllowed, useSceneLoop } from "./useSceneLoop";

const STAR_COUNT = 46;
const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  x: rnd(i, 1),
  y: Math.round(rnd(i, 2) * 1240),
  s: rnd(i, 5) > 0.85 ? 2.5 : 1.5,
  o: 0.35 + rnd(i, 3) * 0.65,
  sp: 0.6 + rnd(i, 4) * 2.2,
}));

let flareAt = -Infinity;

/** Called on each check-off: the aurora and stars flare for 1.4s (read by the running loop). */
export function flareNightSky(): void {
  flareAt = performance.now();
}

export default function NightSky({ accent, progress }: { accent: string; progress: number }) {
  const root = useRef<HTMLDivElement>(null);
  const aurora = useRef<HTMLDivElement>(null);
  const stars = useRef<(HTMLSpanElement | null)[]>([]);
  const allowed = useMotionAllowed();

  useSceneLoop(
    root,
    (t) => {
      const p = progress;
      const flare = allowed ? Math.max(0, 1 - (performance.now() - flareAt) / 1400) : 0;
      const a = aurora.current;
      if (a) {
        const x = Math.sin(t * 0.18) * 26;
        const sy = 1 + Math.sin(t * 0.45) * 0.08;
        a.style.transform = `translateX(${x.toFixed(1)}px) scaleY(${sy.toFixed(3)})`;
        a.style.opacity = Math.min(1, (0.22 + 0.5 * p) * (1 + 0.9 * flare)).toFixed(3);
      }
      STARS.forEach((m, i) => {
        const el = stars.current[i];
        if (!el) return;
        const tw = allowed ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * m.sp + i)) : 1; // frozen: the design's static opacity
        el.style.opacity = (m.o * tw * (0.3 + 0.7 * p) * (1 + 0.6 * flare)).toFixed(3);
      });
    },
    allowed,
  );

  return (
    <div ref={root} data-testid="night-sky" aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div
        ref={aurora}
        style={{
          position: "absolute", left: -30, top: -90, width: "calc(100% + 60px)", maxWidth: 480, height: 300, borderRadius: "50%",
          background: `radial-gradient(closest-side, ${rgba(accent, 0.55)} 0%, ${rgba("#B49FD8", 0.35)} 45%, rgba(18, 21, 16, 0) 100%)`,
          filter: "blur(34px)", opacity: 0.22 + 0.5 * progress,
        }}
      />
      {STARS.map((s, i) => (
        <span
          key={i}
          ref={(el) => {
            stars.current[i] = el;
          }}
          style={{ position: "absolute", left: `${(s.x * 98.5).toFixed(2)}%`, top: s.y, width: s.s, height: s.s, borderRadius: 999, background: "#F3EDE0", opacity: s.o * (0.3 + 0.7 * progress) }}
        />
      ))}
    </div>
  );
}
