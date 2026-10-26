import { useEffect, useRef, useState } from "react";
import type { ToastData } from "../components/Toast";
import { level, lifetimeCheckoffs } from "./stats";
import { actions, useAppState } from "./store";

/**
 * Level-up toast. Fires only on a live transition: on first load any gap between
 * the stored level and lastCelebratedLevel is synced silently (DECISIONS 5).
 */
export function useLevelUp(): { toast: ToastData | null; dismiss: () => void } {
  const state = useAppState();
  const lv = level(lifetimeCheckoffs(state));
  const celebrated = state.ui.lastCelebratedLevel;
  const loaded = useRef(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    if (lv <= celebrated) {
      loaded.current = true;
      return;
    }
    if (!loaded.current) {
      loaded.current = true;
      actions.markCelebratedLevel(lv);
      return;
    }
    actions.markCelebratedLevel(lv);
    setToast({ id: Date.now(), title: `Level ${lv}`, body: "Consistency is compounding. Keep going." });
  }, [lv, celebrated]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return { toast, dismiss: () => setToast(null) };
}
