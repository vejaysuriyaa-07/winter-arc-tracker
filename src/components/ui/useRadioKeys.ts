import type { KeyboardEvent } from "react";

/**
 * Roving focus for a radiogroup of buttons: only the selected option is a Tab
 * stop, and arrow keys move the selection (WAI-ARIA radio group pattern).
 */
export function radioKeys<T>(options: readonly T[], value: T, onChange: (v: T) => void) {
  const onKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const i = (options.indexOf(value) + step + options.length) % options.length;
    onChange(options[i]!);
    const group = e.currentTarget;
    requestAnimationFrame(() => group.querySelectorAll<HTMLElement>('[role="radio"]')[i]?.focus());
  };
  const tabIndex = (v: T): number => (v === value ? 0 : -1);
  return { onKeyDown, tabIndex };
}
