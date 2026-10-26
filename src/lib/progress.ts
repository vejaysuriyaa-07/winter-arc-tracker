// Progress, Month view and Plant detail numbers. Pure: `today` is passed in.
import type { AppState, Arc, Habit } from "../types";
import { addDays, monthOf, type YMD } from "./dates";
import { growth } from "./garden";
import {
  arcDayNumber, arcDaysSoFar, arcHabits, arcScore, bestChain, chain, habitRate, isDone, isScheduled, keptDays,
  monthlyKeptRate, weakestWeekday, weekBars,
} from "./stats";

export const WEEKDAY_PLURAL = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ---------- this arc ----------

export type ArcTiles = { kept: number; daysSoFar: number; score: number | null; chain: number; bestChain: number };

export function arcTiles(state: AppState, arc: Arc, today: YMD): ArcTiles {
  return {
    kept: keptDays(state, arc, today),
    daysSoFar: arcDaysSoFar(arc, today).length,
    score: arcScore(state, arc, today).percent,
    chain: chain(state, arc, today),
    bestChain: bestChain(state, arc, today),
  };
}

export type PlantRow = { habit: Habit; daysDone: number; daysScheduled: number; rate: number | null; g: number; archived: boolean };

/** Every habit of the arc (archived ones too), most days done first, then by name. */
export function plantsRanked(state: AppState, arc: Arc, today: YMD): PlantRow[] {
  return arcHabits(state, arc.id)
    .map((habit) => {
      const r = habitRate(state, habit, today);
      return { habit, daysDone: r.completedDays, daysScheduled: r.scheduledDays, rate: r.percent, g: growth(r.completedDays, arc.lengthDays), archived: habit.archivedAt !== undefined };
    })
    .sort((a, b) => b.daysDone - a.daysDone || a.habit.name.localeCompare(b.habit.name));
}

export function weekLine(state: AppState, arc: Arc, today: YMD): string | null {
  const w = weakestWeekday(weekBars(state, arc, today));
  return w === null ? null : `${WEEKDAY_PLURAL[w]} are your dry spot`;
}

export function timelapseRange(arc: Arc, today: YMD): { first: number; last: number } {
  return { first: 1, last: Math.max(1, Math.min(arc.lengthDays, arcDayNumber(arc, today))) };
}

export function timelapseDay(arc: Arc, dayNumber: number): YMD {
  return addDays(arc.startDate, dayNumber - 1);
}

// ---------- plant detail ----------

export type PlantDay = { date: YMD; status: "done" | "missed" | "today" | "none" };

/** One cell per arc day so far: done, missed, today while open, or none (not scheduled). */
export function plantDays(state: AppState, habit: Habit, today: YMD): PlantDay[] {
  const arc = state.arcs.find((a) => a.id === habit.arcId);
  if (!arc) return [];
  return arcDaysSoFar(arc, today).map((date) => {
    if (!isScheduled(habit, date)) return { date, status: "none" as const };
    if (isDone(state, habit, date)) return { date, status: "done" as const };
    return { date, status: date === today ? ("today" as const) : ("missed" as const) };
  });
}

const norm = (s: string): string => s.trim().toLowerCase();

export type AcrossRow = { arc: Arc; habit: Habit; daysDone: number; daysScheduled: number; rate: number | null };

/** The same habit (matched by name) in every arc, oldest arc first. */
export function habitAcrossArcs(state: AppState, name: string, today: YMD): AcrossRow[] {
  const arcs = state.arcs.filter((a) => !a.deleted).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const out: AcrossRow[] = [];
  for (const arc of arcs) {
    const habit = arcHabits(state, arc.id).find((h) => norm(h.name) === norm(name));
    if (!habit) continue;
    const r = habitRate(state, habit, today);
    out.push({ arc, habit, daysDone: r.completedDays, daysScheduled: r.scheduledDays, rate: r.percent });
  }
  return out;
}

// ---------- all time ----------

export type Ring = { year: number; month: number; rate: number | null; arcId: string | null; inner: number; outer: number; wx: number; wy: number };

/**
 * Tree rings (ProgressAll.dc.html): from radius 9 outward, one per month,
 * thickness 2 + rate*7 (grey gaps at 0.1), 1.5 apart, with a slight wobble.
 * Scaled down when they would not fit inside `maxR`.
 */
export function treeRings(state: AppState, today: YMD, maxR: number): Ring[] {
  const months = monthlyKeptRate(state, today);
  const thick = months.map((m) => 2 + (m.arcIds.length === 0 ? 0.1 : (m.rate ?? 0)) * 7);
  const natural = 9 + thick.reduce((s, t) => s + t + 1.5, 0) - (thick.length ? 1.5 : 0);
  const k = natural > maxR ? (maxR - 9) / (natural - 9) : 1;
  let r = 9;
  return months.map((m, i) => {
    const t = thick[i]! * k;
    const ring = { year: m.year, month: m.month, rate: m.rate, arcId: m.arcIds[0] ?? null, inner: r, outer: r + t, wx: ((i % 3) - 1) * 1.5, wy: (((i + 1) % 3) - 1) * 1.5 };
    r = r + t + 1.5 * k;
    return ring;
  });
}

export function bestMonthLine(state: AppState, today: YMD): string | null {
  let best: { month: number; rate: number } | null = null;
  for (const m of monthlyKeptRate(state, today)) {
    if (m.rate === null) continue;
    if (!best || m.rate > best.rate) best = { month: m.month, rate: m.rate };
  }
  return best ? `Your best month was ${MONTH_NAMES[best.month - 1]}, at ${Math.round(best.rate * 100)}%.` : null;
}

export type TallTree = { name: string; daysDone: number };

/** Habits with the most days done across all arcs, matched by name. */
export function tallestTrees(state: AppState, today: YMD, n: number): TallTree[] {
  const by = new Map<string, TallTree>();
  for (const arc of state.arcs.filter((a) => !a.deleted)) {
    for (const h of arcHabits(state, arc.id)) {
      const k = norm(h.name);
      const done = habitRate(state, h, today).completedDays;
      const cur = by.get(k);
      if (cur) cur.daysDone += done;
      else by.set(k, { name: h.name.trim(), daysDone: done });
    }
  }
  return [...by.values()].filter((t) => t.daysDone > 0).sort((a, b) => b.daysDone - a.daysDone || a.name.localeCompare(b.name)).slice(0, n);
}

export function firstMonthLabel(state: AppState): string | null {
  const arcs = state.arcs.filter((a) => !a.deleted).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  if (!arcs[0]) return null;
  const ym = monthOf(arcs[0].startDate);
  return `${MONTH_NAMES[ym.month - 1]!.slice(0, 3)} ${ym.year}`;
}
