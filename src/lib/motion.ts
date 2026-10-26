/** True when the user asked for reduced motion. Safe outside the browser. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function easeOutCubic(k: number): number {
  return 1 - (1 - k) ** 3;
}

/**
 * Tween a number from `from` to `to` over `ms`, calling `apply` per frame.
 * Returns a cancel function. With reduced motion, applies `to` at once.
 */
export function tween(from: number, to: number, ms: number, apply: (v: number) => void): () => void {
  if (prefersReducedMotion() || typeof requestAnimationFrame !== "function" || from === to) {
    apply(to);
    return () => {};
  }
  const start = performance.now();
  let raf = 0;
  const step = (t: number): void => {
    const k = Math.min(1, (t - start) / ms);
    apply(from + (to - from) * easeOutCubic(k));
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
