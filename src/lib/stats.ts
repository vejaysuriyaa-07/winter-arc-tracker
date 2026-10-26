// All derived numbers. Pure: no Date.now(), no storage. `today` is passed in.
// Rules: SPEC-v2 sections 7 and 9 plus docs/DECISIONS.md.
import type { AppState, Arc, DayLog, Habit } from "../types";
import { logKey } from "../types";
import {
  addDays,
  addMonths,
  diffDays,
  eachDay,
  firstOfMonth,
  lastOfMonth,
  maxDay,
  minDay,
  monthOf,
  startOfWeekMon,
  weekdayMonFirst,
  type YMD,
  type YearMonth,
} from "./dates";

// ---------- arc window ----------

export type ArcPhase = "before" | "active" | "complete";

export function arcEnd(arc: Arc): YMD {
  return addDays(arc.startDate, arc.lengthDays - 1);
}

/** 1-based day number; below 1 before the arc, above lengthDays after it. */
export function arcDayNumber(arc: Arc, today: YMD): number {
  return diffDays(arc.startDate, today) + 1;
}

export function daysLeft(arc: Arc, today: YMD): number {
  return Math.max(0, diffDays(today, arcEnd(arc)));
}

export function arcPhase(arc: Arc, today: YMD): ArcPhase {
  if (today < arc.startDate) return "before";
  if (today > arcEnd(arc)) return "complete";
  return "active";
}

/** Arc start through the earlier of today and the arc's last day. */
export function arcDaysSoFar(arc: Arc, today: YMD): YMD[] {
  const last = minDay(today, arcEnd(arc));
  if (last < arc.startDate) return [];
  return eachDay(arc.startDate, last);
}

/** Arc progress 0..1 by day (SPEC 6, birds). */
export function arcProgress(arc: Arc, today: YMD): number {
  return Math.max(0, Math.min(1, arcDayNumber(arc, today) / arc.lengthDays));
}

// ---------- scheduling ----------

/** Habits of the arc that exist (tombstones dropped), in list order. Includes archived ones. */
export function arcHabits(state: AppState, arcId: string): Habit[] {
  return state.habits.filter((h) => h.arcId === arcId && !h.deleted).sort((a, b) => a.order - b.order);
}

export function isScheduled(habit: Habit, day: YMD): boolean {
  return !habit.deleted && habit.createdAt <= day && (habit.archivedAt === undefined || habit.archivedAt > day);
}

export function scheduledHabits(state: AppState, arcId: string, day: YMD): Habit[] {
  return arcHabits(state, arcId).filter((h) => isScheduled(h, day));
}

export function logOf(state: AppState, arcId: string, day: YMD): DayLog | undefined {
  return state.logs[logKey(arcId, day)];
}

export function isDone(state: AppState, habit: Habit, day: YMD): boolean {
  return logOf(state, habit.arcId, day)?.completedHabitIds.includes(habit.id) ?? false;
}

export type DailyCompletion = {
  scheduled: number;
  completed: number;
  /** null when no habit is scheduled that day */
  percent: number | null;
  logged: boolean;
};

export function dailyCompletion(state: AppState, arcId: string, day: YMD): DailyCompletion {
  const sched = scheduledHabits(state, arcId, day);
  const log = logOf(state, arcId, day);
  const done = new Set(log?.completedHabitIds ?? []);
  const completed = sched.filter((h) => done.has(h.id)).length;
  return {
    scheduled: sched.length,
    completed,
    percent: sched.length === 0 ? null : (completed / sched.length) * 100,
    logged: log !== undefined,
  };
}

// ---------- days ----------

/** true kept, false not kept, null when nothing is scheduled. */
export function isKept(state: AppState, arc: Arc, day: YMD): boolean | null {
  const p = dailyCompletion(state, arc.id, day).percent;
  return p === null ? null : p >= arc.threshold;
}

export function isFull(state: AppState, arc: Arc, day: YMD): boolean {
  return dailyCompletion(state, arc.id, day).percent === 100;
}

export function keptDays(state: AppState, arc: Arc, today: YMD): number {
  return arcDaysSoFar(arc, today).filter((d) => isKept(state, arc, d) === true).length;
}

export function fullDays(state: AppState, arc: Arc, today: YMD): number {
  return arcDaysSoFar(arc, today).filter((d) => isFull(state, arc, d)).length;
}

export type Ratio = { completed: number; scheduled: number; percent: number | null };

/** All done / all scheduled across the arc so far, today included (SPEC 9). */
export function arcScore(state: AppState, arc: Arc, today: YMD): Ratio {
  let completed = 0;
  let scheduled = 0;
  for (const day of arcDaysSoFar(arc, today)) {
    const d = dailyCompletion(state, arc.id, day);
    completed += d.completed;
    scheduled += d.scheduled;
  }
  return { completed, scheduled, percent: scheduled === 0 ? null : (completed / scheduled) * 100 };
}

// ---------- chain (SPEC 7.2) ----------

/** Runs back over `days` (last first). The last day, if it is today and not yet true, is skipped. */
function runBack(days: readonly YMD[], today: YMD, test: (d: YMD) => boolean | null): number {
  let i = days.length - 1;
  if (i < 0) return 0;
  if (days[i] === today && test(days[i]!) !== true) i--;
  let n = 0;
  for (; i >= 0; i--) {
    const k = test(days[i]!);
    if (k === false) break;
    if (k === true) n++;
  }
  return n;
}

function bestRun(days: readonly YMD[], test: (d: YMD) => boolean | null): number {
  let best = 0;
  let run = 0;
  for (const d of days) {
    const k = test(d);
    if (k === false) run = 0;
    else if (k === true) run++;
    if (run > best) best = run;
  }
  return best;
}

/** Consecutive kept days ending today, or yesterday while today is not kept yet. */
export function chain(state: AppState, arc: Arc, today: YMD): number {
  return runBack(arcDaysSoFar(arc, today), today, (d) => isKept(state, arc, d));
}

export function bestChain(state: AppState, arc: Arc, today: YMD): number {
  return bestRun(arcDaysSoFar(arc, today), (d) => isKept(state, arc, d));
}

/** Consecutive full days, same rules as the chain (zero-scheduled days skipped). */
export function fullRun(state: AppState, arc: Arc, today: YMD): number {
  return runBack(arcDaysSoFar(arc, today), today, (d) => (dailyCompletion(state, arc.id, d).percent === null ? null : isFull(state, arc, d)));
}

export function bestFullRun(state: AppState, arc: Arc, today: YMD): number {
  return bestRun(arcDaysSoFar(arc, today), (d) => (dailyCompletion(state, arc.id, d).percent === null ? null : isFull(state, arc, d)));
}

export type ChainDay = { date: YMD; status: "full" | "kept" | "missed" | "pending" | "none" };

/** The bloom chain strip: the last seven days ending today. */
export function chainStrip(state: AppState, arc: Arc, today: YMD): ChainDay[] {
  const out: ChainDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i);
    let status: ChainDay["status"];
    if (date < arc.startDate || date > arcEnd(arc) || dailyCompletion(state, arc.id, date).percent === null) status = "none";
    else if (isFull(state, arc, date)) status = "full";
    else if (isKept(state, arc, date)) status = "kept";
    else status = date === today ? "pending" : "missed";
    out.push({ date, status });
  }
  return out;
}

// ---------- per habit ----------

export type HabitRatio = { scheduledDays: number; completedDays: number; percent: number | null };

export function habitRate(state: AppState, habit: Habit, today: YMD): HabitRatio {
  const arc = state.arcs.find((a) => a.id === habit.arcId);
  if (!arc) return { scheduledDays: 0, completedDays: 0, percent: null };
  let scheduledDays = 0;
  let completedDays = 0;
  for (const day of arcDaysSoFar(arc, today)) {
    if (!isScheduled(habit, day)) continue;
    scheduledDays++;
    if (isDone(state, habit, day)) completedDays++;
  }
  return { scheduledDays, completedDays, percent: scheduledDays === 0 ? null : (completedDays / scheduledDays) * 100 };
}

export function habitDaysDone(state: AppState, habit: Habit, today: YMD): number {
  return habitRate(state, habit, today).completedDays;
}

function habitDays(state: AppState, habit: Habit, today: YMD): YMD[] {
  const arc = state.arcs.find((a) => a.id === habit.arcId);
  if (!arc) return [];
  return arcDaysSoFar(arc, today).filter((d) => isScheduled(habit, d));
}

/** Consecutive scheduled days done, ending today (or the day before while today is open). */
export function habitStreak(state: AppState, habit: Habit, today: YMD): number {
  return runBack(habitDays(state, habit, today), today, (d) => isDone(state, habit, d));
}

export function habitBestStreak(state: AppState, habit: Habit, today: YMD): number {
  return bestRun(habitDays(state, habit, today), (d) => isDone(state, habit, d));
}

// ---------- weeks ----------

/** Index 0 = Monday ... 6 = Sunday; mean completion per weekday; null with no sample. */
export function weekBars(state: AppState, arc: Arc, today: YMD): (number | null)[] {
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const day of arcDaysSoFar(arc, today)) {
    const p = dailyCompletion(state, arc.id, day).percent;
    if (p === null) continue;
    const w = weekdayMonFirst(day);
    sums[w]! += p;
    counts[w]! += 1;
  }
  return sums.map((s, i) => (counts[i] === 0 ? null : s / counts[i]!));
}

/** Lowest weekday; ties pick the first in Mon-Sun order. */
export function weakestWeekday(bars: readonly (number | null)[]): number | null {
  let best: number | null = null;
  bars.forEach((v, i) => {
    if (v === null) return;
    if (best === null || v < bars[best]!) best = i;
  });
  return best;
}

function meanCompletion(state: AppState, arc: Arc, days: readonly YMD[], today: YMD): number | null {
  const last = minDay(today, arcEnd(arc));
  let sum = 0;
  let n = 0;
  for (const d of days) {
    if (d < arc.startDate || d > last) continue;
    const p = dailyCompletion(state, arc.id, d).percent;
    if (p === null) continue;
    sum += p;
    n++;
  }
  return n === 0 ? null : sum / n;
}

export type Last7 = {
  from: YMD;
  to: YMD;
  days: number;
  percent: number | null;
  previousPercent: number | null;
  change: number | null;
  fullDays: number;
};

export function last7Summary(state: AppState, arc: Arc, today: YMD): Last7 {
  const from = addDays(today, -6);
  const days = eachDay(from, today);
  const prev = eachDay(addDays(today, -13), addDays(today, -7));
  const percent = meanCompletion(state, arc, days, today);
  const previousPercent = meanCompletion(state, arc, prev, today);
  const inArc = days.filter((d) => d >= arc.startDate && d <= minDay(today, arcEnd(arc)));
  return {
    from,
    to: today,
    days: 7,
    percent,
    previousPercent,
    change: percent === null || previousPercent === null ? null : percent - previousPercent,
    fullDays: inArc.filter((d) => isFull(state, arc, d)).length,
  };
}

/** Mondays of finished Mon-Sun weeks fully inside the arc where every scheduled day was full. */
export function perfectWeeks(state: AppState, arc: Arc, today: YMD): YMD[] {
  const out: YMD[] = [];
  let mon = startOfWeekMon(arc.startDate);
  if (mon < arc.startDate) mon = addDays(mon, 7);
  const lastDay = minDay(today, arcEnd(arc));
  for (; addDays(mon, 6) <= lastDay; mon = addDays(mon, 7)) {
    const days = eachDay(mon, addDays(mon, 6));
    const scored = days.filter((d) => dailyCompletion(state, arc.id, d).percent !== null);
    if (scored.length > 0 && scored.every((d) => isFull(state, arc, d))) out.push(mon);
  }
  return out;
}

// ---------- months, rings and lifetime ----------

export type MonthRate = YearMonth & { kept: number; days: number; rate: number | null; arcIds: string[] };

function liveArcs(state: AppState): Arc[] {
  return state.arcs.filter((a) => !a.deleted).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
}

/** One entry per calendar month from the first arc's start to today (SPEC 9, rings). */
export function monthlyKeptRate(state: AppState, today: YMD): MonthRate[] {
  const arcs = liveArcs(state);
  if (arcs.length === 0) return [];
  const first = arcs[0]!.startDate;
  if (first > today) return [];
  const out: MonthRate[] = [];
  const end = monthOf(today);
  for (let ym = monthOf(first); ym.year < end.year || (ym.year === end.year && ym.month <= end.month); ym = addMonths(ym, 1)) {
    let kept = 0;
    let days = 0;
    const ids: string[] = [];
    for (const arc of arcs) {
      const lo = maxDay(firstOfMonth(ym), arc.startDate);
      const hi = minDay(minDay(lastOfMonth(ym), arcEnd(arc)), today);
      if (lo > hi) continue;
      ids.push(arc.id);
      for (const d of eachDay(lo, hi)) {
        const k = isKept(state, arc, d);
        if (k === null) continue;
        days++;
        if (k) kept++;
      }
    }
    out.push({ ...ym, kept, days, rate: days === 0 ? null : kept / days, arcIds: ids });
  }
  return out;
}

export type Lifetime = {
  fullGrownTrees: number;
  flowers: number;
  longestStreak: number;
  arcsFinished: number;
  checkoffs: number;
  daysTended: number;
};

/** `fullGrowthDays` comes from lib/garden.ts (kept there so the growth rule lives in one place). */
export function lifetimeCounts(state: AppState, today: YMD, fullGrowthDays: (lengthDays: number) => number): Lifetime {
  const out: Lifetime = { fullGrownTrees: 0, flowers: 0, longestStreak: 0, arcsFinished: 0, checkoffs: 0, daysTended: 0 };
  for (const arc of liveArcs(state)) {
    const days = arcDaysSoFar(arc, today);
    for (const h of arcHabits(state, arc.id)) {
      if (habitDaysDone(state, h, today) >= fullGrowthDays(arc.lengthDays)) out.fullGrownTrees++;
    }
    for (const d of days) {
      const c = dailyCompletion(state, arc.id, d);
      out.checkoffs += c.completed;
      if (c.completed > 0) out.daysTended++;
      if (isKept(state, arc, d)) out.flowers++;
    }
    out.longestStreak = Math.max(out.longestStreak, bestChain(state, arc, today));
    if (arcPhase(arc, today) === "complete") out.arcsFinished++;
  }
  return out;
}

// ---------- calendar ----------

export type Bucket = "future" | "outside" | "unlogged" | "zero" | "some" | "most" | "full";

/** Month view shading (SPEC 5.5). */
export function bucketFor(state: AppState, arc: Arc, day: YMD, today: YMD): Bucket {
  if (day < arc.startDate || day > arcEnd(arc)) return "outside";
  if (day > today) return "future";
  const c = dailyCompletion(state, arc.id, day);
  if (c.percent === null) return "outside";
  if (!c.logged || (c.completed === 0 && day === today)) return "unlogged";
  if (c.percent >= 100) return "full";
  if (c.percent >= arc.threshold) return "most";
  if (c.percent > 0) return "some";
  return "zero";
}
