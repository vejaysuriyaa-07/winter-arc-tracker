import confetti from "canvas-confetti";
import { prefersReducedMotion } from "./motion";

/** Short burst for the 100% moment. Skipped with reduced motion. */
export function burst(): void {
  if (prefersReducedMotion()) return;
  void confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 38,
    origin: { x: 0.5, y: 0.35 },
    colors: ["#22C55E", "#F5B83D", "#E7EFE9"],
    disableForReducedMotion: true,
    zIndex: 70,
  });
}
