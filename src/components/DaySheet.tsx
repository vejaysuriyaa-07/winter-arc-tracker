import { useState } from "react";
import { useSheet } from "../lib/useSheet";
import type { AppState } from "../types";
import { formatShort, type YMD } from "../lib/dates";
import { dailyCompletion, scheduledHabits } from "../lib/stats";
import { actions } from "../lib/store";
import { CATEGORY_LABEL } from "./HabitRow";

type Props = { state: AppState; date: YMD; today: YMD; onClose: () => void };

export default function DaySheet({ state, date, today, onClose }: Props) {
  const isToday = date === today;
  const [editing, setEditing] = useState(isToday); // Calendar keys this sheet by date
  useSheet(onClose);

  const habits = scheduledHabits(state.habits, date);
  const done = new Set(state.logs[date]?.completedHabitIds ?? []);
  const c = dailyCompletion(state, date);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Checklist for ${formatShort(date)}`}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <section
        className="relative max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-card p-4 pb-8"
        data-testid="day-sheet"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="num text-xl font-bold uppercase tracking-wide">{isToday ? "Today" : formatShort(date)}</p>
            <p className="text-xs text-muted" data-testid="day-sheet-summary">
              {c.scheduled === 0
                ? "No habits scheduled"
                : `${c.completed} of ${c.scheduled} done, ${Math.round(c.percent ?? 0)}%${c.logged ? "" : " (not logged)"}`}
            </p>
          </div>
          {!isToday && (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              aria-pressed={editing}
              className={`tap rounded-xl border px-4 text-sm font-semibold ${
                editing ? "border-green bg-card-2 text-green" : "border-line text-muted"
              }`}
            >
              {editing ? "Done" : "Edit"}
            </button>
          )}
        </header>
        {habits.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nothing was scheduled on this day.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {habits.map((h) => {
              const checked = done.has(h.id);
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    disabled={!editing}
                    onClick={() => actions.setCheckoff(date, h.id, !checked)}
                    data-testid="sheet-habit"
                    className="tap flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2 text-left disabled:opacity-80"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[15px] ${checked ? "text-muted line-through" : ""}`}>{h.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-dim">{CATEGORY_LABEL[h.category]}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                        checked ? "border-green bg-green text-bg" : "border-dim"
                      }`}
                    >
                      {checked && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
