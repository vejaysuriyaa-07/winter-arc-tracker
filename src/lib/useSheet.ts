import { useEffect, useRef, type RefObject } from "react";

// Open overlays, newest last. Only the topmost one answers Escape, and the app
// behind them (#root) is inert while any is open. Overlays render in a portal
// outside #root, so they stay interactive.
const stack: symbol[] = [];

function setInert(on: boolean): void {
  const root = document.getElementById("root");
  if (!root) return;
  if (on) root.setAttribute("inert", "");
  else root.removeAttribute("inert");
}

/**
 * Escape closes the topmost overlay (held keys do not repeat it), the page behind
 * stops scrolling and becomes inert, focus moves into the overlay and comes back
 * to where it was on close.
 */
export function useSheet(onClose: () => void, focusRef?: RefObject<HTMLElement | null>): void {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const id = Symbol("sheet");
    stack.push(id);
    setInert(true);
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = focusRef?.current;
    // Focus the first control inside the panel (not the backdrop's close button).
    const panel = target?.querySelector<HTMLElement>("section") ?? target;
    const first = panel?.querySelector<HTMLElement>("button, [href], input, [tabindex]:not([tabindex='-1'])");
    (first ?? target)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape" || e.repeat || stack[stack.length - 1] !== id) return;
      e.stopImmediatePropagation();
      close.current();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      stack.splice(stack.indexOf(id), 1);
      if (stack.length === 0) setInert(false);
      before?.focus({ preventScroll: true });
    };
  }, [focusRef]);
}
