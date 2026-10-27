// Watches for visitors whose rule just came true while the app is open: a toast
// "A <visitor> moved in" and a medium haptic (twice, on native). The entrance in
// the garden plays from GardenVisitor, once, guarded by ui.celebrated.
import { useCallback, useEffect, useState } from "react";
import { actions, useAppState } from "../../lib/store";
import { useToday } from "../../lib/today";
import { arrivalLine, visitorById } from "../../lib/visitors";
import { feedback } from "../../lib/feedback";
import { playSound } from "../../lib/sounds";
import UndoToast, { type ToastData } from "../ui/UndoToast";

export default function VisitorWatcher() {
  const state = useAppState();
  const today = useToday();
  const [toast, setToast] = useState<ToastData | null>(null);
  useEffect(() => {
    const arrived = actions.syncVisitorsLive(today);
    if (arrived.length === 0) return;
    const lines = arrived.map((a) => visitorById(a.visitorId)).filter((v) => v !== undefined).map(arrivalLine);
    const text = lines.length === 1 ? lines[0]! : `${lines.slice(0, -1).join(". ")}. ${lines.at(-1)}`;
    setToast({ id: Date.now(), text });
    feedback("visitor", state.settings.haptics);
    playSound("visitor", state.settings.sounds);
  }, [state.logs, state.habits, state.arcs, today]); // re-check only when something that can earn a visitor changes
  const close = useCallback(() => setToast(null), []);
  return <UndoToast toast={toast} onDone={close} />;
}
