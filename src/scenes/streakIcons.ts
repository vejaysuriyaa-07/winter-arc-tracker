// One loop animates every streak icon on the page (port of Skin.dc.html animIcons).
// Icons register their SVG parts here; the page's scene loop calls animateIcons(t).
import type { IconSpec } from "../lib/today-view";

export type IconEls = {
  seed: SVGEllipseElement | null;
  sprout: SVGGElement | null;
  flame: SVGGElement | null;
  core: SVGPathElement | null;
  drop: SVGPathElement | null;
  flake: SVGPathElement | null;
  spark: SVGPathElement | null;
  bolt: SVGPathElement | null;
  cloud: SVGPathElement | null;
};

type Entry = { els: IconEls; spec: IconSpec; phase: number };

const entries = new Set<Entry>();

export function registerIcon(e: Entry): () => void {
  entries.add(e);
  return () => {
    entries.delete(e);
  };
}

const fade = (u: number): string => (u < 0.15 ? u / 0.15 : u > 0.8 ? (1 - u) / 0.2 : 1).toFixed(2);

export function animateIcons(t: number, moving: boolean): void {
  for (const { els: e, spec: m, phase: ph } of entries) {
    const w = m.wind;
    if (e.sprout) {
      let deg = moving ? Math.sin(t * (1.6 + 0.4 * w) + ph) * 7 * w : 0;
      if (moving && m.rough) deg += Math.sin(t * 13 + ph * 3) * 4;
      e.sprout.setAttribute("transform", `rotate(${deg.toFixed(2)} 9 18)`);
    }
    if (e.flame) {
      const damp = m.wet ? 0.82 : 1;
      const sy = (1 + (moving ? 0.13 * Math.sin(t * 9 + ph) + 0.07 * Math.sin(t * 15.3 + ph * 2) : 0)) * damp;
      const sx = (1 - (moving ? 0.06 * Math.sin(t * 7.1 + ph) : 0)) * damp;
      const k = moving ? Math.sin(t * 4.6 + ph) * 5 * Math.min(2, w) : 0;
      e.flame.setAttribute("transform", `translate(9 18) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) skewX(${k.toFixed(2)}) translate(-9 -18)`);
      if (e.core) e.core.setAttribute("opacity", moving ? (0.75 + 0.25 * Math.sin(t * 17 + ph * 4)).toFixed(2) : "0.9");
    }
    if (e.seed) {
      const s = 1 + (moving ? 0.06 * Math.sin(t * 1.4 + ph) : 0);
      e.seed.setAttribute("transform", `translate(9 15.5) scale(${s.toFixed(3)}) translate(-9 -15.5)`);
    }
    if (e.drop && m.drop) {
      const per = m.rough ? 0.9 : 1.5;
      const u = moving ? ((t + ph) % per) / per : 0.45;
      e.drop.setAttribute("transform", `translate(${(11.5 - u * 1.5).toFixed(2)} ${(-4 + u * 14).toFixed(2)})`);
      e.drop.setAttribute("opacity", fade(u));
    }
    if (e.flake && m.flake) {
      const per = m.rough ? 1.4 : 2.8;
      const u = moving ? ((t + ph) % per) / per : 0.3;
      const x = 12 + (moving ? Math.sin(t * 2 + ph) * 2.2 : 0);
      e.flake.setAttribute("transform", `translate(${x.toFixed(2)} ${(-4 + u * 18).toFixed(2)}) rotate(${(u * 180).toFixed(1)})`);
      e.flake.setAttribute("opacity", fade(u));
    }
    if (e.spark && m.spark) {
      const u = moving ? ((t + ph * 0.7) % 2.6) / 2.6 : 0.175;
      const s = u < 0.35 ? Math.sin((u / 0.35) * Math.PI) : 0;
      e.spark.setAttribute("transform", `translate(15 3.5) scale(${s.toFixed(3)}) rotate(${(u * 90).toFixed(1)})`);
    }
    if (e.bolt && m.bolt) {
      const u = moving ? ((t + ph * 1.3) % 3.4) / 3.4 : 0.03;
      e.bolt.setAttribute("opacity", (u > 0.02 && u < 0.06) || (u > 0.09 && u < 0.12) ? "1" : "0");
    }
    if (e.cloud && m.cloud) {
      e.cloud.setAttribute("transform", `translate(${(12 + (moving ? Math.sin(t * 0.6 + ph) * 2.5 : 0)).toFixed(2)} 3.5)`);
    }
  }
}
