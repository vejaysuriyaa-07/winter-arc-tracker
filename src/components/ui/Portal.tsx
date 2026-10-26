import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** Renders overlays at the end of <body>, above the page's stacking contexts and the tab bar. */
export default function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
