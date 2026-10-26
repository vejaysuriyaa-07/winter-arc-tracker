// Month view (SPEC 5.5, Calendar.dc.html): month grid from Monday, shaded by
// completion; the last 7 days; tap a day to see and backfill its checklist.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { Arc } from "../types";
import { actions, useAppState } from "../lib/store";
import { useToday } from "../lib/today";
import { activeArc, arcEnd, arcPhase, arcScore, bestChain, bucketFor, chain, isDone, last7Summary, scheduledHabits, weakestWeekday, weekBars, type Bucket } from "../lib/stats";
import { addMonths, dayOfMonth, eachDay, firstOfMonth, formatMonthDay, formatMonthYear, lastOfMonth, minDay, monthOf, weekdayMonFirst, type YearMonth } from "../lib/dates";
import { WEEKDAY_PLURAL } from "../lib/progress";
import Sheet from "../components/ui/Sheet";
import { useTheme } from "../theme/ThemeProvider";
import { rgba, MISS } from "../theme/tokens";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LONG = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

const ymKey = (m: YearMonth): number => m.year * 12 + m.month;

/** Every month the arc touches, first to last (future days show dimmed). */
function monthsOf(arc: Arc): YearMonth[] {
  const out: YearMonth[] = [];
  const last = monthOf(arcEnd(arc));
  for (let m = monthOf(arc.startDate); ymKey(m) <= ymKey(last); m = addMonths(m, 1)) out.push(m);
  return out;
}

function Cell({ day, bucket, today, onOpen }: { day: string; bucket: Bucket; today: boolean; onOpen?: () => void }) {
  const th = useTheme();
  const fill: Record<Bucket, string> = {
    full: th.accent, most: rgba(th.accent, 0.5), some: rgba(th.accent, 0.28), zero: "transparent", unlogged: "transparent",
    future: rgba(th.t.text, 0.04), outside: "transparent",
  };
  const strong = bucket === "full";
  return (
    <button
      type="button"
      data-testid="month-cell"
      data-date={day}
      data-bucket={bucket}
      disabled={!onOpen}
      onClick={onOpen}
      aria-label={`${formatMonthDay(day)}, ${bucket === "full" ? "all done" : bucket === "most" ? "kept" : bucket === "some" ? "some done" : bucket === "zero" ? "missed" : bucket === "unlogged" ? "not logged" : bucket === "future" ? "coming up" : "outside the arc"}`}
      className="relative flex h-[46px] items-center justify-center text-[14px]"
      style={{
        borderRadius: 12,
        background: fill[bucket],
        color: strong ? th.t.onAccent : bucket === "future" || bucket === "outside" ? rgba(th.t.text, 0.35) : th.t.text,
        border: bucket === "unlogged" ? `1px dashed ${th.t.ring}` : "1px solid transparent",
        boxShadow: today ? `0 0 0 2px ${th.accent}` : "none",
        fontWeight: today ? 700 : 500,
      }}
    >
      <span className="num">{dayOfMonth(day)}</span>
      {bucket === "zero" && <span aria-hidden="true" className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full" style={{ background: MISS }} />}
    </button>
  );
}

function Legend() {
  const th = useTheme();
  const items: [string, React.CSSProperties][] = [
    ["All done", { background: th.accent }],
    ["Kept", { background: rgba(th.accent, 0.5) }],
    ["Some", { background: rgba(th.accent, 0.28) }],
    ["Missed", { background: "transparent", boxShadow: `inset 0 -5px 0 -3px ${MISS}`, border: `1px solid ${th.t.line}` }],
    ["Not logged", { border: `1px dashed ${th.t.ring}` }],
    ["Today", { boxShadow: `0 0 0 2px ${th.accent}` }],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Legend">
      {items.map(([label, s]) => (
        <li key={label} className="flex items-center gap-1.5 text-[12px]" style={{ color: th.t.muted }}>
          <span aria-hidden="true" className="h-3.5 w-3.5 rounded" style={s} />
          {label}
        </li>
      ))}
    </ul>
  );
}

function DaySheet({ arc, day, onClose }: { arc: Arc; day: string; onClose: () => void }) {
  const th = useTheme();
  const state = useAppState();
  const today = useToday();
  const finished = arcPhase(arc, today) === "complete" || arc.frozenAt !== undefined;
  const [editing, setEditing] = useState(day === today && !finished);
  const habits = scheduledHabits(state, arc.id, day);
  return (
    <Sheet title={LONG.format(new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))))} onClose={onClose} testId="day-sheet">
      {habits.length === 0 ? (
        <p className="pb-2 text-[15px]" style={{ color: th.t.muted }}>Nothing was scheduled this day.</p>
      ) : (
        <>
          <ul className="flex flex-col">
            {habits.map((h) => {
              const done = isDone(state, h, day);
              return (
                <li key={h.id} style={{ borderBottom: `1px solid ${th.t.line}` }}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-disabled={!editing}
                    data-testid="day-habit"
                    onClick={() => editing && actions.setCheckoff(arc.id, day, h.id, !done)}
                    className="flex min-h-[52px] w-full items-center gap-3 text-left"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ border: `1.5px solid ${th.checkRing(done)}`, background: th.checkFill(done), opacity: editing ? 1 : 0.8 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={th.t.onAccent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: done ? 1 : 0 }} aria-hidden="true"><path d="M5 12.5L9.5 17L19 7" /></svg>
                    </span>
                    <span className="font-medium">{h.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {finished && <p className="mt-2 text-[13px]" style={{ color: th.t.muted }}>This arc is finished, so its days stay as they were.</p>}
          {day !== today && !finished && (
            <button type="button" data-testid="day-edit" onClick={() => setEditing((e) => !e)} className="tap mt-2 text-[15px] font-semibold" style={{ color: th.accent }}>
              {editing ? "Done" : "Edit this day"}
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}

export default function Month() {
  const th = useTheme();
  const state = useAppState();
  const today = useToday();
  const navigate = useNavigate();
  const arc = activeArc(state);
  const months = useMemo(() => (arc ? monthsOf(arc) : []), [arc]);
  const initial = arc ? monthOf(minDay(today, arcEnd(arc)) < arc.startDate ? arc.startDate : minDay(today, arcEnd(arc))) : monthOf(today);
  const [shown, setShown] = useState<YearMonth>(initial);
  const [open, setOpen] = useState<string | null>(null);
  if (!arc) {
    return <p className="pt-4 text-[15px]" style={{ color: th.t.muted }}>Start an arc to see its month.</p>;
  }
  const idx = months.findIndex((m) => ymKey(m) === ymKey(shown));
  const cur = idx === -1 ? months[0]! : shown;
  const days = eachDay(firstOfMonth(cur), lastOfMonth(cur));
  const lead = weekdayMonFirst(days[0]!);
  const s7 = last7Summary(state, arc, today);
  const weak = weakestWeekday(weekBars(state, arc, today));
  const score = arcScore(state, arc, today).percent;
  const pct = (v: number | null): string => (v === null ? "–" : `${Math.round(v)}%`);
  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex h-11 items-center justify-between">
        <button type="button" onClick={() => navigate("/progress")} className="tap flex items-center gap-1 text-[15px] font-medium" style={{ color: th.accent }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 6L9 12L15 18" /></svg>
          Progress
        </button>
        <span className="text-[15px]" style={{ color: th.t.muted }}>{arc.name}</span>
      </header>
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous month" disabled={idx <= 0} onClick={() => setShown(months[idx - 1]!)} className="tap flex items-center justify-center rounded-full disabled:opacity-30">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 6L9 12L15 18" /></svg>
        </button>
        <h1 data-testid="month-title" className="text-[24px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>{formatMonthYear(cur)}</h1>
        <button type="button" aria-label="Next month" disabled={idx >= months.length - 1} onClick={() => setShown(months[idx + 1]!)} className="tap flex items-center justify-center rounded-full disabled:opacity-30">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 6L15 12L9 18" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK.map((w) => (
          <span key={w} className="text-center text-[12px]" style={{ color: th.t.muted }}>{w}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`pad-${i}`} />)}
        {days.map((d) => {
          const b = bucketFor(state, arc, d, today);
          const openable = b !== "future" && b !== "outside";
          return <Cell key={d} day={d} bucket={b} today={d === today} {...(openable ? { onOpen: () => setOpen(d) } : {})} />;
        })}
      </div>
      <Legend />
      <section className="card flex flex-col gap-3 p-4" data-testid="last7">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[20px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Last 7 days</h2>
          <span className="text-[13px]" style={{ color: th.t.muted }}>{formatMonthDay(s7.from)} to {formatMonthDay(s7.to)}</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="num text-[56px] leading-none" data-testid="last7-score" style={{ fontFamily: th.t.fonts.display }}>{pct(s7.percent)}</span>
          {s7.change !== null && (
            <span data-testid="last7-change" className="text-[15px]" style={{ color: th.t.muted }}>
              {s7.change >= 0 ? "+" : "−"}{Math.abs(Math.round(s7.change))} vs the week before
            </span>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
          <dt style={{ color: th.t.muted }}>Full days</dt><dd data-testid="last7-full" className="num text-right">{s7.fullDays} of 7</dd>
          <dt style={{ color: th.t.muted }}>Weakest day</dt><dd className="text-right">{weak === null ? "–" : WEEKDAY_PLURAL[weak]}</dd>
          <dt style={{ color: th.t.muted }}>Streak</dt><dd className="num text-right">{chain(state, arc, today)} days, best {bestChain(state, arc, today)}</dd>
          <dt style={{ color: th.t.muted }}>Arc so far</dt><dd className="num text-right">{pct(score)}</dd>
        </dl>
      </section>
      {open && <DaySheet arc={arc} day={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
