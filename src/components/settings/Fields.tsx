// Settings rows and fields in the current look. Text and number fields keep a
// local draft and commit on blur or Enter, so typing never snaps mid-edit.
import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { compareDays, isValidYMD, type YMD } from "../../lib/dates";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const th = useTheme();
  return (
    <section className="card flex flex-col px-4" aria-label={title}>
      <h2 className="pt-3 pb-1 text-[13px] font-semibold uppercase tracking-wide" style={{ color: th.t.muted }}>{title}</h2>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

export function Divider() {
  const th = useTheme();
  return <span aria-hidden="true" className="h-px" style={{ background: th.t.line }} />;
}

export function RowButton({ label, value, onClick, testId, danger }: { label: string; value?: string; onClick: () => void; testId?: string; danger?: boolean }) {
  const th = useTheme();
  return (
    <button type="button" data-testid={testId} onClick={onClick} className="flex min-h-[52px] items-center justify-between gap-3 text-left">
      <span className="text-[16px] font-medium" style={danger ? { color: "#F87171" } : undefined}>{label}</span>
      <span className="flex items-center gap-1.5 text-[15px]" style={{ color: th.t.muted }}>
        {value}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 6L15 12L9 18" /></svg>
      </span>
    </button>
  );
}

export function RowText({ label, value, testId }: { label: string; value: string; testId?: string }) {
  const th = useTheme();
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3">
      <span className="text-[16px] font-medium">{label}</span>
      <span data-testid={testId} className="text-[15px]" style={{ color: th.t.muted }}>{value}</span>
    </div>
  );
}

export function TextRow({ label, value, onCommit, testId }: { label: string; value: string; onCommit: (v: string) => void; testId?: string }) {
  const th = useTheme();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = (): void => {
    if (draft.trim() && draft.trim() !== value) onCommit(draft.trim());
    else setDraft(value);
  };
  return (
    <label className="flex min-h-[52px] items-center justify-between gap-3">
      <span className="text-[16px] font-medium">{label}</span>
      <input
        aria-label={label}
        data-testid={testId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className="h-11 min-w-0 flex-1 bg-transparent text-right text-[15px] outline-none"
        style={{ color: th.t.muted }}
      />
    </label>
  );
}

export function NumberRow({ label, value, min, max, suffix, onCommit, testId }: { label: string; value: number; min: number; max: number; suffix: string; onCommit: (v: number) => void; testId?: string }) {
  const th = useTheme();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const n = Number(draft);
  const ok = draft !== "" && Number.isInteger(n) && n >= min && n <= max;
  const commit = (): void => {
    if (ok && n !== value) onCommit(n);
    else if (!ok) setDraft(String(value));
  };
  return (
    <label className="flex min-h-[52px] items-center justify-between gap-3">
      <span className="text-[16px] font-medium">{label}</span>
      <span className="flex h-11 items-center gap-2 text-[15px]" style={{ color: th.t.muted }}>
        <input
          aria-label={label}
          data-testid={testId}
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className="h-9 w-16 text-right outline-none"
          style={{ color: ok ? th.t.text : "#F87171", padding: `0 ${Math.min(th.input.padX, 10)}px`, borderBottom: th.input.underline, borderRadius: th.input.radius, background: th.input.background }}
        />
        {suffix}
      </span>
    </label>
  );
}

/** A date that saves on blur or Enter; a date before `min` snaps back. */
export function DateRow({ label, value, min, onCommit, testId }: { label: string; value: YMD; min: YMD; onCommit: (v: YMD) => void; testId?: string }) {
  const th = useTheme();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = (): void => {
    if (isValidYMD(draft) && compareDays(draft, min) >= 0) {
      if (draft !== value) onCommit(draft);
    } else setDraft(value);
  };
  return (
    <label className="flex min-h-[52px] items-center justify-between gap-3">
      <span className="text-[16px] font-medium">{label}</span>
      <input
        type="date"
        aria-label={label}
        data-testid={testId}
        min={min}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()} // Chromium keeps focus inside a date field on blur()
        className="h-11 bg-transparent text-right text-[15px] outline-none"
        style={{ color: th.t.muted }}
      />
    </label>
  );
}
