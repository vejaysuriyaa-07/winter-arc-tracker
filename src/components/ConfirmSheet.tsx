import { useSheet } from "../lib/useSheet";
type Props = {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmSheet({ title, body, confirmLabel, danger = false, onConfirm, onCancel }: Props) {
  useSheet(onCancel);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <button type="button" aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-black/60" />
      <section className="relative w-full max-w-md rounded-t-3xl border border-line bg-card p-5 pb-8" data-testid="confirm-sheet">
        <p id="confirm-title" className="num text-xl font-bold uppercase tracking-wide">
          {title}
        </p>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="tap rounded-xl border border-line font-semibold text-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="confirm-yes"
            className={`tap rounded-xl font-semibold ${danger ? "bg-red text-bg" : "bg-green text-bg"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
