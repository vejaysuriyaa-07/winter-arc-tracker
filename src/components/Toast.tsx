import { AnimatePresence, motion } from "motion/react";

export type ToastData = { id: number; title: string; body?: string };

type Props = { toast: ToastData | null; onDismiss: () => void };

export default function Toast({ toast, onDismiss }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.button
            key={toast.id}
            type="button"
            onClick={onDismiss}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-gold/50 bg-card px-4 py-3 text-left shadow-glow-gold"
            data-testid="toast"
          >
            <span className="num text-3xl font-bold text-gold" aria-hidden="true">
              ★
            </span>
            <span>
              <span className="num block text-lg font-bold uppercase tracking-wide text-gold">{toast.title}</span>
              {toast.body && <span className="block text-xs text-muted">{toast.body}</span>}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
