import { useLayoutEffect, useRef, type ReactNode } from "react";
import { tween } from "../lib/motion";

type Props = {
  /** 0-100 */
  percent: number;
  /** gold styling for a complete day */
  gold?: boolean;
  /** content layered on top of the wave (the big number) */
  children?: ReactNode;
};

const CREST = 36; // px height of the crest svg
const PERIOD = 400; // px, one full wave; the path holds four so the loop is seamless at -50%

function wavePath(amplitude: number): string {
  const width = PERIOD * 4;
  const mid = CREST / 2;
  const pts: string[] = [];
  for (let x = 0; x <= width; x += 8) {
    const y = mid + amplitude * Math.sin((x / PERIOD) * Math.PI * 2);
    pts.push(`${x},${y.toFixed(2)}`);
  }
  return `M${pts.join(" L")} L${width},${CREST} L0,${CREST} Z`;
}

const PATH = wavePath(10);

function Layer({
  layerRef,
  className,
  speed,
  delay,
}: {
  layerRef: React.RefObject<HTMLDivElement | null>;
  className: string;
  speed: string;
  delay: string;
}) {
  return (
    <div
      ref={layerRef}
      className={`wave-layer absolute inset-x-0 top-0 flex h-full flex-col ${className}`}
      style={{ transform: "translateY(100%)" }}
    >
      <div className="relative h-9 w-full overflow-hidden" style={{ height: CREST }}>
        <svg
          className="wave-drift absolute left-0 top-0 h-full"
          style={{ width: PERIOD * 4, ["--wave-speed" as string]: speed, animationDelay: delay }}
          viewBox={`0 0 ${PERIOD * 4} ${CREST}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={PATH} fill="currentColor" />
        </svg>
      </div>
      <div className="flex-1 bg-current" />
    </div>
  );
}

export default function WaveProgress({ percent, gold = false, children }: Props) {
  const back = useRef<HTMLDivElement | null>(null);
  const front = useRef<HTMLDivElement | null>(null);
  const shown = useRef<number | null>(null);
  const target = Math.max(0, Math.min(100, percent));

  useLayoutEffect(() => {
    const apply = (v: number): void => {
      shown.current = v;
      const t = `translateY(${(100 - v).toFixed(3)}%)`;
      if (back.current) back.current.style.transform = t;
      if (front.current) front.current.style.transform = t;
    };
    // First paint: jump straight to the level, no animation on load.
    if (shown.current === null) {
      apply(target);
      return;
    }
    return tween(shown.current, target, 600, apply);
  }, [target]);

  const tone = gold ? "text-gold" : "text-green";
  return (
    <div
      className={`relative h-56 overflow-hidden rounded-2xl border border-line bg-card ${
        gold ? "shadow-glow-gold" : "shadow-glow"
      }`}
      data-testid="wave"
      data-percent={Math.round(target)}
      data-gold={gold ? "true" : "false"}
    >
      <Layer layerRef={back} className={`${tone} opacity-60`} speed="11s" delay="-4s" />
      <Layer layerRef={front} className={tone} speed="7s" delay="0s" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center">{children}</div>
    </div>
  );
}
