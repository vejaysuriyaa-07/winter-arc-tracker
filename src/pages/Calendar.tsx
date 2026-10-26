import { useState } from "react";
import DaySheet from "../components/DaySheet";
import {
  addMonths,
  dayOfMonth,
  eachDay,
  firstOfMonth,
  formatMonthYear,
  lastOfMonth,
  maxDay,
  minDay,
  monthOf,
  weekdayMonFirst,
  type YMD,
  type YearMonth,
} from "../lib/dates";
import { arcEnd, arcMonths, averagePercent, bucketFor, dailyCompletion, monthAverage, type Bucket } from "../lib/stats";
import { useAppState } from "../lib/store";
import { useToday } from "../lib/today";

const MOOD_EMOJI = ["", "😫", "😕", "😐", "🙂", "🤩"] as const;
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const BUCKET_CLASS: Record<Bucket, string> = {
  unlogged: "border border-dashed border-dim text-muted",
  zero: "bg-card-2 border border-line text-muted",
  low: "bg-green-soft/40 border border-green-soft text-ink",
  mid: "bg-green-soft border border-green-deep text-ink",
  high: "bg-green-deep border border-green text-ink",
  full: "bg-green border-2 border-gold text-bg font-bold shadow-glow-gold",
};

function sameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

function pct(v: number | null): string {
  return v === null ? "–" : `${Math.round(v)}%`;
}

export default function Calendar() {
  const state = useAppState();
  const today = useToday();
  const { settings } = state;
  const end = arcEnd(settings);
  const months = arcMonths(settings);
  const initial = monthOf(minDay(maxDay(today, settings.startDate), end));
  const [chosen, setYm] = useState<YearMonth>(initial);
  const [open, setOpen] = useState<YMD | null>(null);

  // If settings changed under us and the chosen month no longer overlaps the arc, fall back.
  const ym = months.some((m) => sameMonth(m, chosen)) ? chosen : initial;
  const idx = months.findIndex((m) => sameMonth(m, ym));
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < months.length - 1;

  const first = firstOfMonth(ym);
  const days = eachDay(first, lastOfMonth(ym));
  const lead = weekdayMonFirst(first);
  const cells: (YMD | null)[] = [...Array<null>(lead).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (YMD | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const inArc = (d: YMD) => d >= settings.startDate && d <= end;

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setYm(addMonths(ym, -1))}
          disabled={!canPrev}
          aria-label="Previous month"
          className="tap rounded-xl border border-line text-lg disabled:opacity-30"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="num text-2xl font-bold uppercase tracking-wide">{formatMonthYear(ym)}</p>
          <p className="text-xs text-muted" data-testid="month-average">
            Month average {pct(monthAverage(state, ym, today))}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setYm(addMonths(ym, 1))}
          disabled={!canNext}
          aria-label="Next month"
          className="tap rounded-xl border border-line text-lg disabled:opacity-30"
        >
          ›
        </button>
      </header>

      <section className="card p-3" aria-label="Month grid">
        <div className="grid grid-cols-[repeat(7,1fr)_2.2rem] gap-1 text-center text-[10px] uppercase tracking-wide text-dim">
          {WEEKDAYS.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
          <span>avg</span>
        </div>
        {weeks.map((week, wi) => {
          const rowDays = week.filter((d): d is YMD => d !== null);
          const avg = averagePercent(state, rowDays, today);
          return (
            <div key={wi} className="mt-1 grid grid-cols-[repeat(7,1fr)_2.2rem] items-center gap-1">
              {week.map((d, di) => {
                if (d === null) return <span key={di} />;
                const dayNum = dayOfMonth(d);
                if (!inArc(d) || d > today) {
                  return (
                    <span
                      key={d}
                      className={`num flex aspect-square items-center justify-center rounded-lg text-sm ${
                        inArc(d) ? "text-dim" : "text-dim/40"
                      } ${d === today ? "ring-1 ring-ink/40" : ""}`}
                      data-testid="day-cell"
                      data-date={d}
                      data-state={inArc(d) ? "future" : "outside"}
                    >
                      {dayNum}
                    </span>
                  );
                }
                const c = dailyCompletion(state, d);
                const bucket = bucketFor(c);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setOpen(d)}
                    aria-label={`${d}, ${c.logged ? `${Math.round(c.percent ?? 0)}%` : "not logged"}`}
                    data-testid="day-cell"
                    data-date={d}
                    data-bucket={bucket}
                    className={`num flex aspect-square items-center justify-center rounded-lg text-sm ${BUCKET_CLASS[bucket]} ${
                      d === today && bucket !== "full" ? "ring-1 ring-ink/60" : ""
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
              <span className="num text-right text-xs text-muted" data-testid="week-average">
                {pct(avg)}
              </span>
            </div>
          );
        })}
        <p className="mt-3 text-[10px] text-dim">
          Tap a day to see its checklist. Dashed cells were not logged. Days after today and outside the arc are not tappable.
        </p>
      </section>

      <section className="card p-3" aria-label="Mood strip">
        <p className="text-[11px] uppercase tracking-wide text-dim">Mood</p>
        <div className="mt-2 grid grid-cols-[repeat(16,1fr)] gap-y-1" data-testid="mood-strip">
          {days.map((d) => {
            const mood = state.logs[d]?.mood;
            return (
              <span key={d} title={d} className="flex flex-col items-center">
                <span className={`text-base leading-5 ${mood ? "" : "text-dim/40"}`}>{mood ? MOOD_EMOJI[mood] : "·"}</span>
                <span className="num text-[9px] leading-3 text-dim">{dayOfMonth(d)}</span>
              </span>
            );
          })}
        </div>
        {!days.some((d) => state.logs[d]?.mood) && (
          <p className="mt-2 text-xs text-muted">No moods logged this month. Pick one in the daily check-in.</p>
        )}
      </section>

      {open !== null && <DaySheet key={open} state={state} date={open} today={today} onClose={() => setOpen(null)} />}
    </main>
  );
}
