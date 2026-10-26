// One requestAnimationFrame loop per scene. Frames write to refs, never React state.
// Pauses while the page is hidden or the scene is off screen. When motion is off
// (system reduced motion or the Settings toggle) it draws one static frame and stops.
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { useAppState } from "../lib/store";

const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribeReduce(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const reduced = (): boolean => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(REDUCE).matches;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduce, reduced, () => false);
}

/** False under system reduced motion or when "Wind and animations" is off. */
export function useMotionAllowed(): boolean {
  const motion = useAppState().settings.motion;
  return motion && !useReducedMotion();
}

/** The time used for the frozen frame: a calm moment with no gust. */
export const STATIC_T = 0;

/**
 * Runs `frame(t)` (seconds since start) every animation frame while `root` is
 * visible. `frame` is read through a ref so it can change without restarting.
 */
export function useSceneLoop(root: RefObject<Element | null>, frame: (t: number) => void, allowed: boolean): void {
  const fn = useRef(frame);
  fn.current = frame;

  // Frozen: redraw the static frame after every render, so elements added by a
  // changed scene (more drops, a new plant) land in their static positions too.
  useLayoutEffect(() => {
    if (!allowed) fn.current(STATIC_T);
  });

  useEffect(() => {
    if (!allowed) return;
    let raf = 0;
    let onScreen = true;
    let elapsed = 0;
    let last: number | null = null;

    const tick = (now: number): void => {
      if (last !== null) elapsed += Math.min(0.1, (now - last) / 1000); // no jump after a pause
      last = now;
      fn.current(elapsed);
      raf = requestAnimationFrame(tick);
    };
    const start = (): void => {
      if (raf || document.hidden || !onScreen) return;
      last = null;
      raf = requestAnimationFrame(tick);
    };
    const stop = (): void => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = (): void => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    let io: IntersectionObserver | null = null;
    const el = root.current;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        if (onScreen) start();
        else stop();
      });
      io.observe(el);
    }
    fn.current(elapsed);
    start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
    };
  }, [allowed, root]);
}
