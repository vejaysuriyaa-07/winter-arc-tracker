// All derived numbers. Pure: no Date.now(), no storage. `today` is passed in.
// Rules are SPEC section 8 plus docs/DECISIONS.md 1 and 6.
import type { AppState, ArcSettings, DayLog, Habit } from "../types";
import {
  addDays,
  addMonths,
  diffDays,
  eachDay,
  firstOfMonth,
  lastOfMonth,
  minDay,
  monthOf,
  weekdayMonFirst,
  type YMD,
  type YearMonth,
} from "./dates";

export const CHECKOFFS_PER_LEVEL = 50;

export type TreeStage = { name: "seed" | "sprout" | "sapling" | "tree" | "blooming"; min: number };
export const TREE_STAGES: readonly TreeStage[] = [
  { name: "seed", min: 0 },
  { name: "sprout", min: 50 },
  { name: "sapling", min: 150 },
  { name: "tree", min: 300 },
  { name: "blooming", min: 500 },
];

// ---------- arc window ----------

export type ArcPhase = "before" | "active" | "complete";

export function arcEnd(settings: ArcSettings): YMD {
  return addDays(settings.startDate, settings.lengthDays - 1);
}

/** 1-based day number; below 1 before the arc, above lengthDays after it. */
export function arcDayNumber(settings: ArcSettings, today: YMD): number {
  return diffDays(settings.startDate, today) + 1;
}

export function daysLeft(settings: ArcSettings, today: YMD): number {
  return Math.max(0, diffDays(today, arcEnd(settings)));
}

export function arcPhase(settings: ArcSettings, today: YMD): ArcPhase {
  if (today < settings.startDate) return "before";
  if (today > arcEnd(settings)) return "complete";
  return "active";
}

/** Arc start through the earlier of today and the arc's last day. */
export function arcDaysSoFar(settings: ArcSettings, today: YMD): YMD[] {
  const last = minDay(today, arcEnd(settings));
  if (last < settings.startDate) return [];
  return eachDay(settings.startDate, last);
}

// ---------- scheduling and daily completion ----------

export function isScheduled(habit: Habit, day: YMD): boolean {
  return habit.createdAt <= day && (habit.archivedAt === undefined || habit.archivedAt > day);
}

export function scheduledHabits(habits: readonly Habit[], day: YMD): Habit[] {
  return habits.filter((h) => isScheduled(h, day)).sort((a, b) => a.order - b.order);
}

export type DailyCompletion = {
  scheduled: number;
  completed: number;
  /** null when no habit is scheduled that day */
  percent: number | null;
  logged: boolean;
};

function completedScheduled(habits: readonly Habit[], log: DayLog | undefined, day: YMD): number {
  if (!log) return 0;
  const done = new Set(log.completedHabitIds);
  let n = 0;
  for (const h of habits) if (isScheduled(h, day) && done.has(h.id)) n++;
  return n;
}

export function dailyCompletion(state: AppState, day: YMD): DailyCompletion {
  const scheduled = scheduledHabits(state.habits, day).length;
  const log = state.logs[day];
  const completed = completedScheduled(state.habits, log, day);
  return {
    scheduled,
    completed,
    percent: scheduled === 0 ? null : (completed / scheduled) * 100,
    logged: log !== undefined,
  };
}

// ---------- consistency ----------

export type Ratio = { completed: number; scheduled: number; percent: number | null };

export function overallConsistency(state: AppState, today: YMD): Ratio {
  let completed = 0;
  let scheduled = 0;
  for (const day of arcDaysSoFar(state.settings, today)) {
    const d = dailyCompletion(state, day);
    completed += d.completed;
    scheduled += d.scheduled;
  }
  return { completed, scheduled, percent: scheduled === 0 ? null : (completed / scheduled) * 100 };
}

// ---------- streaks ----------

/** true kept, false broken, null when the day has nothing scheduled. */
export function isKept(state: AppState, day: YMD): boolean | null {
  const p = dailyCompletion(state, day).percent;
  return p === null ? null : p >= state.settings.streakThreshold;
}

export function currentStreak(state: AppState, today: YMD): number {
  const days = arcDaysSoFar(state.settings, today);
  let i = days.length - 1;
  if (i < 0) return 0;
  // Today (or the arc's last day) is in progress: if it isn't kept yet, start from the day before.
  const last = days[i]!;
  if (last === today && isKept(state, last) !== true) i--;
  let n = 0;
  for (; i >= 0; i--) {
    const k = isKept(state, days[i]!);
    if (k === false) break;
    if (k === true) n++;
  }
  return n;
}

export function longestStreak(state: AppState, today: YMD): number {
  let best = 0;
  let run = 0;
  for (const day of arcDaysSoFar(state.settings, today)) {
    const k = isKept(state, day);
    if (k === false) run = 0;
    else if (k === true) run++;
    if (run > best) best = run;
  }
  return best;
}

// ---------- per-habit ----------

export type HabitRatio = { scheduledDays: number; completedDays: number; percent: number | null };

export function habitConsistency(state: AppState, habit: Habit, today: YMD): HabitRatio {
  let scheduledDays = 0;
  let completedDays = 0;
  for (const day of arcDaysSoFar(state.settings, today)) {
    if (!isScheduled(habit, day)) continue;
    scheduledDays++;
    if (state.logs[day]?.completedHabitIds.includes(habit.id)) completedDays++;
  }
  return {
    scheduledDays,
    completedDays,
    percent: scheduledDays === 0 ? null : (completedDays / scheduledDays) * 100,
  };
}

export type LeaderboardRow = HabitRatio & { habit: Habit; archived: boolean };

/** Active habits best first (ties alphabetical), then archived habits, same order. */
export function leaderboard(state: AppState, today: YMD): LeaderboardRow[] {
  const rows: LeaderboardRow[] = state.habits.map((habit) => ({
    habit,
    archived: habit.archivedAt !== undefined,
    ...habitConsistency(state, habit, today),
  }));
  const rank = (a: LeaderboardRow, b: LeaderboardRow): number => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    const pa = a.percent ?? -1;
    const pb = b.percent ?? -1;
    if (pa !== pb) return pb - pa;
    return a.habit.name.localeCompare(b.habit.name);
  };
  return rows.sort(rank);
}

// ---------- averages ----------

/** Mean daily completion over the given days that are arc days so far and have something scheduled. */
export function averagePercent(state: AppState, days: readonly YMD[], today: YMD): number | null {
  const start = state.settings.startDate;
  const last = minDay(today, arcEnd(state.settings));
  let sum = 0;
  let n = 0;
  for (const day of days) {
    if (day < start || day > last) continue;
    const p = dailyCompletion(state, day).percent;
    if (p === null) continue;
    sum += p;
    n++;
  }
  return n === 0 ? null : sum / n;
}

export function weekAverage(state: AppState, weekStartMon: YMD, today: YMD): number | null {
  return averagePercent(state, eachDay(weekStartMon, addDays(weekStartMon, 6)), today);
}

export function monthAverage(state: AppState, ym: YearMonth, today: YMD): number | null {
  return averagePercent(state, eachDay(firstOfMonth(ym), lastOfMonth(ym)), today);
}

/** Index 0 = Monday ... 6 = Sunday. null when that weekday has no scored arc day yet. */
export function weekdayAverages(state: AppState, today: YMD): (number | null)[] {
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const day of arcDaysSoFar(state.settings, today)) {
    const p = dailyCompletion(state, day).percent;
    if (p === null) continue;
    const w = weekdayMonFirst(day);
    sums[w] = (sums[w] ?? 0) + p;
    counts[w] = (counts[w] ?? 0) + 1;
  }
  return sums.map((s, i) => ((counts[i] ?? 0) === 0 ? null : s / (counts[i] ?? 1)));
}

export function weakestWeekday(averages: readonly (number | null)[]): number | null {
  let best: number | null = null;
  averages.forEach((v, i) => {
    if (v === null) return;
    if (best === null || v < (averages[best] ?? Infinity)) best = i;
  });
  return best;
}

// ---------- sleep ----------

export function sleepScore(hours: number, quality: number, targetHours: number): number {
  return 50 * Math.min(hours / targetHours, 1) + 50 * (quality / 5);
}

export type SleepPoint = { date: YMD; hours: number | null; score: number | null };
export type SleepSummary = {
  nights: number; // nights with hours recorded
  avgHours: number | null;
  avgScore: number | null; // over nights with both values
  series: SleepPoint[]; // one point per arc day so far
};

export function sleepSummary(state: AppState, today: YMD): SleepSummary {
  const series: SleepPoint[] = [];
  let hoursSum = 0;
  let nights = 0;
  let scoreSum = 0;
  let scored = 0;
  for (const date of arcDaysSoFar(state.settings, today)) {
    const log = state.logs[date];
    const hours = log?.sleepHours ?? null;
    let score: number | null = null;
    if (hours !== null) {
      hoursSum += hours;
      nights++;
      if (log?.sleepQuality !== undefined) {
        score = sleepScore(hours, log.sleepQuality, state.settings.sleepTargetHours);
        scoreSum += score;
        scored++;
      }
    }
    series.push({ date, hours, score });
  }
  return {
    nights,
    avgHours: nights === 0 ? null : hoursSum / nights,
    avgScore: scored === 0 ? null : scoreSum / scored,
    series,
  };
}

// ---------- level and tree ----------

/** Completed scheduled habits across all logs, inside or outside the arc. */
export function lifetimeCheckoffs(state: AppState): number {
  let n = 0;
  for (const [date, log] of Object.entries(state.logs)) n += completedScheduled(state.habits, log, date);
  return n;
}

export function hasAnyCheckoff(state: AppState): boolean {
  return lifetimeCheckoffs(state) > 0;
}

export function level(lifetime: number): number {
  return Math.floor(lifetime / CHECKOFFS_PER_LEVEL) + 1;
}

export type LevelProgress = { level: number; into: number; needed: number; next: number };

export function levelProgress(lifetime: number): LevelProgress {
  const lv = level(lifetime);
  return { level: lv, into: lifetime % CHECKOFFS_PER_LEVEL, needed: CHECKOFFS_PER_LEVEL, next: lv + 1 };
}

export function treeStage(lifetime: number): TreeStage {
  let stage = TREE_STAGES[0]!;
  for (const s of TREE_STAGES) if (lifetime >= s.min) stage = s;
  return stage;
}

// ---------- series for the wave chart ----------

export type DayPoint = { date: YMD; percent: number; logged: boolean; isToday: boolean };

/** Arc days so far; unlogged days plot at 0 with logged=false; zero-scheduled days plot at 0. */
export function dailySeries(state: AppState, today: YMD): DayPoint[] {
  return arcDaysSoFar(state.settings, today).map((date) => {
    const d = dailyCompletion(state, date);
    return { date, percent: d.percent ?? 0, logged: d.logged, isToday: date === today };
  });
}

/** Last `n` points of the series (or all when n is null). */
export function windowed<T>(points: readonly T[], n: number | null): T[] {
  return n === null ? [...points] : points.slice(Math.max(0, points.length - n));
}

// ---------- calendar ----------

export type Bucket = "unlogged" | "zero" | "low" | "mid" | "high" | "full";

/** Shading bucket for a calendar cell. Zero-scheduled logged days read as "zero". */
export function bucketFor(d: { percent: number | null; logged: boolean }): Bucket {
  if (!d.logged) return "unlogged";
  const p = d.percent ?? 0;
  if (p >= 100) return "full";
  if (p >= 80) return "high";
  if (p >= 50) return "mid";
  if (p > 0) return "low";
  return "zero";
}

/** Every month that overlaps the arc, first to last. */
export function arcMonths(settings: ArcSettings): YearMonth[] {
  const out: YearMonth[] = [];
  const last = monthOf(arcEnd(settings));
  let ym = monthOf(settings.startDate);
  while (ym.year < last.year || (ym.year === last.year && ym.month <= last.month)) {
    out.push(ym);
    ym = addMonths(ym, 1);
  }
  return out;
}
