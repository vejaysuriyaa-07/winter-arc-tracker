import { useLayoutEffect, useRef } from "react";
import { tween } from "../lib/motion";

type Props = { value: number; suffix?: string; className?: string; testId?: string; ms?: number };

/** Animated number: tweens between values by writing textContent, never React state per frame. */
export default function CountUp({ value, suffix = "", className = "", testId, ms = 600 }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const shown = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = (v: number): void => {
      el.textContent = `${Math.round(v)}${suffix}`;
    };
    if (shown.current === null) {
      shown.current = value;
      write(value);
      return;
    }
    const from = shown.current;
    shown.current = value;
    return tween(from, value, ms, write);
  }, [value, suffix, ms]);
  return (
    <span ref={ref} className={className} data-testid={testId}>
      {`${Math.round(value)}${suffix}`}
    </span>
  );
}
