import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useTheme } from "../../theme/ThemeProvider";

export type ToastData = { id: number; text: string; onUndo?: () => void };

/** Bottom toast above the tab bar; dismisses itself after five seconds. */
export default function UndoToast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  const th = useTheme();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [toast, onDone]);
  return (
    <div className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4" style={{ bottom: "calc(max(env(safe-area-inset-bottom), 22px) + 74px)" }}>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            data-testid="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 py-2 pr-2 pl-4"
            style={{ borderRadius: 16, background: th.isNight ? "#1F241B" : th.t.surface, border: `1px solid ${th.t.line}`, boxShadow: "0 12px 32px rgba(0, 0, 0, 0.25)", color: th.t.text }}
          >
            <span className="flex-1 text-sm leading-snug">{toast.text}</span>
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.();
                  onDone();
                }}
                className="tap rounded-xl px-3.5 text-[15px] font-semibold"
                style={{ color: th.accent }}
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
