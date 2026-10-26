// The garden: renders a SceneModel (lib/garden.ts) in the layer order of SPEC 6.
// Ported from docs/design/Garden.dc.html. Drawn in a 358x300 box and scaled to
// the container width. One rAF loop writes transforms to refs (useSceneLoop).
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { SceneModel, ScenePlant } from "../lib/garden";
import { useMotionAllowed, useSceneLoop } from "./useSceneLoop";

export const SCENE_W = 358;
export const SCENE_H = 300;

const GOLD = "#F5B83D";

type Props = {
  model: SceneModel;
  /** Visible height in scene units (the card crops the bottom when smaller). */
  height?: number;
  /** Force a static frame (thumbnails, timelapse frames, recap). */
  still?: boolean;
  label?: string;
  /** Rendered between the bloom flower and the night overlay (found visitor). */
  visitor?: ReactNode;
  className?: string;
};

type Els = {
  plants: (HTMLDivElement | null)[];
  birds: (HTMLDivElement | null)[];
  clouds: (HTMLDivElement | null)[];
  drops: (HTMLSpanElement | null)[];
  stars: (HTMLSpanElement | null)[];
  flies: (HTMLSpanElement | null)[];
  aurora: (HTMLDivElement | null)[];
};

function Plant({ p, palette, setRef }: { p: ScenePlant; palette: SceneModel["palette"]; setRef: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      data-testid="plant"
      data-id={p.id}
      data-g={p.g.toFixed(3)}
      data-wilt={p.wilt ? "true" : "false"}
      style={{
        position: "absolute", left: p.slot.x - 60, bottom: p.slot.b, width: 120, height: 160,
        transform: `scale(${p.slot.s})`, transformOrigin: "50% 100%", pointerEvents: "none",
      }}
    >
      <div ref={setRef} style={{ width: 120, height: 160, transformOrigin: "50% 100%", transform: `rotate(${p.lean}deg)` }}>
        <svg width="120" height="160" viewBox="0 0 120 160" aria-hidden="true" style={{ overflow: "visible" }}>
          <ellipse cx="60" cy="157" rx={p.moundRx} ry="4" fill={palette.mound} />
          <path d={p.trunk} fill="none" stroke={p.trunkColor} strokeWidth={p.trunkW} strokeLinecap="round" />
          <path d={p.sprout} fill={palette.stem} />
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
      </div>
    </div>
  );
}

const GRASS = [
  "M14 262L16 252M18 262L18 250M22 262L20 253",
  "M96 270L98 260M100 270L100 257M104 270L102 261",
  "M188 258L190 248M192 258L192 246M196 258L194 249",
  "M262 276L264 266M266 276L266 263M270 276L268 267",
  "M336 262L338 252M340 262L340 250M344 262L342 253",
  "M58 288L60 279M62 288L62 277M66 288L64 280",
  "M300 292L302 283M304 292L304 281M308 292L306 284",
];

const RAINBOW = ["#F87171", "#FB923C", "#FACC15", "#4ADE80", "#38BDF8", "#818CF8", "#C084FC"];

const AURORA = [
  { left: -20, top: 6, w: 200, h: 120, bg: "linear-gradient(180deg, rgba(52, 211, 153, 0) 0%, rgba(52, 211, 153, 0.85) 45%, rgba(34, 211, 238, 0) 100%)" },
  { left: 110, top: 0, w: 180, h: 140, bg: "linear-gradient(180deg, rgba(167, 139, 250, 0) 0%, rgba(167, 139, 250, 0.75) 40%, rgba(52, 211, 153, 0) 100%)" },
  { left: 220, top: 10, w: 170, h: 110, bg: "linear-gradient(180deg, rgba(34, 211, 238, 0) 0%, rgba(34, 211, 238, 0.8) 50%, rgba(167, 139, 250, 0) 100%)" },
];

export default function GardenScene({ model: m, height = SCENE_H, still = false, label, visitor, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const els = useRef<Els>({ plants: [], birds: [], clouds: [], drops: [], stars: [], flies: [], aurora: [] });
  const allowed = useMotionAllowed() && !still;

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = (): void => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / SCENE_W);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Port of the tick in Garden.dc.html componentDidMount.
  const frame = (t: number): void => {
    const e = els.current;
    const gust = Math.pow(Math.max(0, Math.sin(t * 0.42) * Math.sin(t * 0.17 + 1)), 1.5) * 2.4;
    const w = m.wind;
    m.plants.forEach((p, i) => {
      const el = e.plants[i];
      if (!el) return;
      const sway = Math.sin(t * 1.5 + p.phase) * (1.4 + 2.4 * gust) * w * (p.wilt ? 0.35 : 1);
      const shake = Math.sin(t * 9 + p.phase * 3) * 0.6 * gust * w * (p.wilt ? 0 : 1);
      el.style.transform = `rotate(${(p.lean + sway + shake).toFixed(2)}deg)`;
    });
    m.birds.forEach((b, i) => {
      const el = e.birds[i];
      if (!el) return;
      const x = ((t * (16 + i * 5) + i * 95) % 420) - 30;
      const y = b.y + Math.sin(t * 1.7 + i) * 5;
      const flap = 0.5 + 0.5 * Math.abs(Math.sin(t * 7 + i * 1.3));
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scaleY(${flap.toFixed(2)})`;
    });
    m.clouds.forEach((c, i) => {
      const el = e.clouds[i];
      if (!el) return;
      const x = ((t * (3 + i * 0.8) + i * 110) % 480) - 100;
      el.style.transform = `translate(${x.toFixed(1)}px, ${c.y}px)`;
    });
    m.drops.forEach((d, i) => {
      const el = e.drops[i];
      if (!el) return;
      if (m.precip === "snow") {
        const y = ((t * d.speed + d.off) % 310) - 10;
        const x = d.x + Math.sin(t * 0.8 + i) * 8 + gust * 6 * w;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      } else {
        const y = ((t * d.speed + d.off) % 320) - 20;
        el.style.transform = `translate(${(d.x - y * 0.2).toFixed(1)}px, ${y.toFixed(1)}px) rotate(12deg)`;
      }
    });
    m.stars.forEach((s, i) => {
      const el = e.stars[i];
      if (el) el.style.opacity = (s.o * (0.55 + 0.45 * Math.sin(t * s.sp + i))).toFixed(2);
    });
    m.fireflies.forEach((f, i) => {
      const el = e.flies[i];
      if (!el) return;
      const x = f.x + Math.sin(t * f.sx + i) * 26;
      const y = f.y + Math.sin(t * f.sy + i * 1.7) * 14;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.opacity = (0.3 + 0.7 * Math.abs(Math.sin(t * 1.8 + i))).toFixed(2);
    });
    for (let i = 0; i < m.aurora; i++) {
      const el = e.aurora[i];
      if (!el) continue;
      const x = Math.sin(t * (0.25 + i * 0.07) + i) * 30;
      const sy = 1 + Math.sin(t * (0.6 + i * 0.15) + i * 2) * 0.18;
      el.style.transform = `translateX(${x.toFixed(1)}px) skewX(-18deg) scaleY(${sy.toFixed(3)})`;
      el.style.opacity = (0.5 + 0.35 * Math.sin(t * 0.5 + i)).toFixed(2);
    }
  };
  useSceneLoop(box, frame, allowed);

  const back = m.plants.map((p, i) => [p, i] as const).filter(([p]) => p.slot.row === "back");
  const front = m.plants.map((p, i) => [p, i] as const).filter(([p]) => p.slot.row === "front");
  const set = <K extends keyof Els>(k: K, i: number) => (el: Els[K][number]) => {
    (els.current[k] as Els[K][number][])[i] = el;
  };
  const description =
    label ?? `Garden with ${m.plants.length} plants, ${m.flowers.length} flowers${m.birds.length ? ` and ${m.birds.length} birds` : ""}`;

  return (
    <div
      ref={box}
      role="img"
      aria-label={description}
      data-testid="garden"
      data-season={m.season}
      data-mood={m.mood}
      data-flowers={m.flowers.length}
      data-birds={m.birds.length}
      data-bloom={m.bloom ? "true" : "false"}
      data-motion={allowed ? "on" : "off"}
      className={className}
      style={{ position: "relative", width: "100%", height: height * scale, overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute", left: 0, top: 0, width: SCENE_W, height: SCENE_H,
          transform: `scale(${scale})`, transformOrigin: "0 0",
          background: `linear-gradient(180deg, ${m.sky[0]} 0%, ${m.sky[1]} 100%)`,
        }}
      >
        {m.sun && (
          <div aria-hidden="true" style={{ position: "absolute", top: 28, right: 44, width: 44, height: 44, borderRadius: 999, background: "#FDE68A", boxShadow: "0 0 48px 16px rgba(253, 230, 138, 0.45)" }} />
        )}
        {m.moon && (
          <div data-testid="moon" aria-hidden="true" style={{ position: "absolute", top: 24, right: 48, width: 34, height: 34, borderRadius: 999, background: "#F1F5F9", boxShadow: "0 0 36px 10px rgba(241, 245, 249, 0.3)" }} />
        )}
        {m.stars.map((s, i) => (
          <span key={i} ref={set("stars", i)} data-testid="star" aria-hidden="true" style={{ position: "absolute", left: s.x, top: s.y, width: s.s, height: s.s, borderRadius: 999, background: "#F8FAFC", opacity: s.o }} />
        ))}
        {AURORA.slice(0, m.aurora).map((a, i) => (
          <div key={i} ref={set("aurora", i)} data-testid="aurora" aria-hidden="true" style={{ position: "absolute", left: a.left, top: a.top, width: a.w, height: a.h, background: a.bg, filter: "blur(14px)", transform: "skewX(-18deg)", opacity: 0.7 }} />
        ))}
        {m.shootingStar && (
          <span
            data-testid="shooting-star"
            aria-hidden="true"
            style={{
              position: "absolute", left: 300, top: 18, width: 70, height: 2, borderRadius: 2,
              background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, #FFFFFF 100%)",
              boxShadow: "0 0 8px 2px rgba(255, 255, 255, 0.6)",
              animation: allowed ? "shooting-star 1.6s ease-out 0.4s 1 both" : "none",
              opacity: allowed ? undefined : 0.9,
              transform: allowed ? undefined : "translate(-120px, 60px) rotate(-24deg)",
            }}
          />
        )}
        {m.rainbow && (
          <svg data-testid="rainbow" aria-hidden="true" width={SCENE_W} height={SCENE_H} viewBox="0 0 358 300" style={{ position: "absolute", left: 0, top: 0, opacity: 0.6 }}>
            <g fill="none" strokeWidth="7">
              {RAINBOW.map((c, i) => (
                <path key={c} d={`M${20 + i * 7} 230A${160 - i * 7} ${160 - i * 7} 0 0 1 ${340 - i * 7} 230`} stroke={c} />
              ))}
            </g>
          </svg>
        )}
        {m.clouds.map((c, i) => (
          <div key={i} ref={set("clouds", i)} aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: 90, height: 34, opacity: m.cloudOpacity, transform: `translate(${i * 100 - 40}px, ${c.y}px)` }}>
            <svg width="90" height="34" viewBox="0 0 90 34">
              <path d="M10 30Q0 30 2 22Q4 14 14 15Q18 4 32 6Q42 -2 54 6Q66 4 70 14Q84 13 86 22Q88 30 78 30Z" fill={m.cloudColor} />
            </svg>
          </div>
        ))}

        <svg aria-hidden="true" width={SCENE_W} height={SCENE_H} viewBox="0 0 358 300" style={{ position: "absolute", left: 0, top: 0 }}>
          <path d="M0 186C80 160 180 176 260 164C300 158 340 168 358 162L358 300L0 300Z" fill={m.palette.ground2} />
        </svg>

        {back.map(([p, i]) => (
          <Plant key={p.id} p={p} palette={m.palette} setRef={set("plants", i)} />
        ))}

        <svg aria-hidden="true" width={SCENE_W} height={SCENE_H} viewBox="0 0 358 300" style={{ position: "absolute", left: 0, top: 0 }}>
          <path d="M0 236C70 220 150 232 220 222C280 214 330 226 358 220L358 300L0 300Z" fill={m.palette.ground1} />
          <g fill="none" stroke={m.palette.grass} strokeWidth="1.6" strokeLinecap="round">
            {GRASS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </svg>

        {m.flowers.map((f, i) => (
          <span
            key={i}
            data-testid="flower"
            data-gold={f.gold ? "true" : "false"}
            aria-hidden="true"
            style={{
              position: "absolute", left: f.x, bottom: f.y, width: f.s, height: f.s, borderRadius: 999,
              background: f.gold ? `radial-gradient(circle, ${GOLD} 0 34%, ${f.color} 38%)` : f.color,
              boxShadow: `0 0 0 1.5px ${f.ring}`,
            }}
          />
        ))}

        {front.map(([p, i]) => (
          <Plant key={p.id} p={p} palette={m.palette} setRef={set("plants", i)} />
        ))}

        <div
          data-testid="bloom-flower"
          aria-hidden="true"
          style={{
            position: "absolute", left: 160, bottom: 58, width: 40, height: 52, transformOrigin: "50% 100%",
            transform: `scale(${m.bloom ? 1 : 0})`, transition: allowed ? "transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
          }}
        >
          <svg width="40" height="52" viewBox="0 0 40 52">
            <path d="M20 52C20 40 19 32 20 22" fill="none" stroke={m.palette.stem} strokeWidth="2.4" strokeLinecap="round" />
            <path d="M20 40Q12 37 10 30Q17 31 20 37Z" fill={m.palette.stem} />
            {[[20, 6], [28, 12], [25, 21], [15, 21], [12, 12]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill={m.palette.bloomA} />
            ))}
            {/* Gold centre, not the design's bloomB: SPEC 13 says full bloom plants a gold-centred flower. */}
            <circle cx="20" cy="14" r="4" fill={GOLD} />
          </svg>
        </div>

        {visitor}

        {m.overlay && (
          <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 120, bottom: 0, background: `linear-gradient(180deg, rgba(8, 12, 32, 0) 0%, ${m.overlay} 35%)`, pointerEvents: "none" }} />
        )}
        {m.fireflies.map((f, i) => (
          <span key={i} ref={set("flies", i)} data-testid="firefly" aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: 5, height: 5, borderRadius: 999, background: "#FDE68A", boxShadow: "0 0 10px 4px rgba(253, 230, 138, 0.65)", transform: `translate(${f.x}px, ${f.y}px)` }} />
        ))}
        {m.birds.map((b, i) => (
          <div key={i} ref={set("birds", i)} data-testid="bird" aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: 18, height: 10, transform: `translate(${40 + i * 70}px, ${b.y}px)` }}>
            <svg width="18" height="10" viewBox="0 0 18 10">
              <path d="M1 6Q5 1 9 6Q13 1 17 6" fill="none" stroke={m.birdColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ))}
        {m.drops.map((d, i) => (
          <span key={i} ref={set("drops", i)} data-testid="drop" aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: d.w, height: d.h, borderRadius: d.round ? 999 : 1, background: d.color, transform: `translate(${d.x}px, ${d.off}px)` }} />
        ))}
      </div>
    </div>
  );
}
