// Confirmation, scoring explainer and habits editor sheets for Settings.
import { useState } from "react";
import type { Arc } from "../../types";
import { actions, useAppState } from "../../lib/store";
import { useToday } from "../../lib/today";
import { arcHabits } from "../../lib/stats";
import { canRestore } from "../../lib/mutations";
import Sheet from "../ui/Sheet";
import { useTheme } from "../../theme/ThemeProvider";
import { MISS } from "../../theme/tokens";

export function ConfirmSheet({ title, body, confirm, danger, onConfirm, onClose }: { title: string; body: string; confirm: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  const th = useTheme();
  return (
    <Sheet title={title} onClose={onClose} testId="confirm-sheet">
      <p className="text-[15px]" style={{ color: th.t.muted }}>{body}</p>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button type="button" onClick={onClose} className="h-12 rounded-2xl text-[16px] font-semibold" style={{ boxShadow: `0 0 0 1px ${th.t.line}` }}>Cancel</button>
        <button type="button" data-testid="confirm-yes" onClick={onConfirm} className="h-12 rounded-2xl text-[16px] font-semibold" style={danger ? { background: MISS, color: "#FFFFFF" } : { background: th.accentGradient, color: th.t.onAccent }}>
          {confirm}
        </button>
      </div>
    </Sheet>
  );
}

export function ScoringSheet({ arc, onClose }: { arc: Arc | undefined; onClose: () => void }) {
  const th = useTheme();
  const pct = arc?.threshold ?? 80;
  const rules = [
    ["Which habits count on a day", "A habit counts from the day it was added up to the day before it was removed. Removing a habit never changes earlier days."],
    ["A day's score", "Habits done that day, out of the habits that counted. A day with nothing to do is skipped."],
    [`A kept day`, `A day at ${pct}% or more. A full day is 100%: a full bloom.`],
    ["Your chain", "Kept days in a row, up to today, or yesterday while today is still open. Missing a day starts the chain again; your plants keep their growth."],
    ["Arc score", "Every habit done in the arc so far, out of every habit that counted, today included."],
    ["Each habit's rate", "Days you did it, out of the days it counted in this arc."],
    ["A plant's growth", "Each day you do a habit, its plant grows. It reaches full size after about three quarters of the arc's days, and at least 7 days."],
    ["Tree rings", "One ring per month: the share of days kept that month, across every arc that ran in it."],
  ];
  return (
    <Sheet title="How scoring works" onClose={onClose} testId="scoring-sheet">
      <dl className="flex max-h-[60dvh] flex-col gap-3 overflow-y-auto pb-2">
        {rules.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5">
            <dt className="text-[15px] font-semibold">{k}</dt>
            <dd className="text-[14px]" style={{ color: th.t.muted }}>{v}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}

export function HabitsSheet({ arc, onClose }: { arc: Arc; onClose: () => void }) {
  const th = useTheme();
  const state = useAppState();
  const today = useToday();
  const [name, setName] = useState("");
  const all = arcHabits(state, arc.id);
  const active = all.filter((h) => h.archivedAt === undefined);
  const removedToday = state.habits.filter((h) => h.arcId === arc.id && (h.archivedAt !== undefined || h.deleted) && canRestore(h, today));
  const move = (i: number, d: -1 | 1): void => {
    const ids = active.map((h) => h.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    actions.reorderHabits(arc.id, ids);
  };
  const field = { padding: `0 ${th.input.padX}px`, borderBottom: th.input.underline, borderRadius: th.input.radius, background: th.input.background, color: th.t.text };
  return (
    <Sheet title="Habits" onClose={onClose} testId="habits-sheet">
      <ul className="flex max-h-[50dvh] flex-col overflow-y-auto">
        {active.map((h, i) => (
          <li key={h.id} data-testid="habit-edit-row" className="flex items-center gap-1" style={{ borderBottom: `1px solid ${th.t.line}` }}>
            <input
              aria-label={`Name of ${h.name}`}
              defaultValue={h.name}
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (!name) e.target.value = h.name;
                else if (name !== h.name) actions.editHabit(h.id, { name });
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              className="h-12 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
            />
            <button type="button" aria-label={`Move ${h.name} up`} disabled={i === 0} onClick={() => move(i, -1)} className="tap flex items-center justify-center disabled:opacity-30" style={{ color: th.t.muted }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 15L12 9L18 15" /></svg>
            </button>
            <button type="button" aria-label={`Move ${h.name} down`} disabled={i === active.length - 1} onClick={() => move(i, 1)} className="tap flex items-center justify-center disabled:opacity-30" style={{ color: th.t.muted }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 9L12 15L18 9" /></svg>
            </button>
            <button type="button" aria-label={`Remove ${h.name}`} onClick={() => actions.removeHabit(today, h.id)} className="tap flex items-center justify-center" style={{ color: th.t.muted }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" /></svg>
            </button>
          </li>
        ))}
      </ul>
      {removedToday.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {removedToday.map((h) => (
            <li key={h.id} className="flex min-h-11 items-center justify-between text-[14px]" style={{ color: th.t.muted }}>
              <span>{h.name} removed. Its tree stops growing.</span>
              <button type="button" onClick={() => actions.restoreHabit(today, h.id)} className="tap font-semibold" style={{ color: th.accent }}>Undo</button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          actions.addHabit(today, arc.id, { name });
          setName("");
        }}
      >
        <input aria-label="New habit name" placeholder="Add a habit" value={name} onChange={(e) => setName(e.target.value)} className="h-12 min-w-0 flex-1 text-[15px] outline-none" style={field} />
        <button type="submit" aria-label="Add habit" className="flex h-12 w-12 flex-none items-center justify-center" style={{ borderRadius: th.input.radius, background: th.input.buttonBackground, color: th.input.buttonColor }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5V19M5 12H19" /></svg>
        </button>
      </form>
    </Sheet>
  );
}
