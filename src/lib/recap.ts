// The Sunday recap (SPEC 5.9, 7.5). Pure: `today` and `now` are passed in.
import type { AppState, Arc, VisitorFound } from "../types";
import { addDays, diffDays, eachDay, formatLocal, maxDay, minDay, startOfWeekMon, type YMD } from "./dates";
import { birdCount, growth } from "./garden";
import { arcDayNumber, arcEnd, arcHabits, dailyCompletion, isDone, isFull, isKept, isScheduled, weakestWeekday, weekBars } from "./stats";
import { nextVisitor, teaser } from "./visitors";
import { WEEKDAY_PLURAL } from "./progress";

/** Mondays of the arc's Mon-Sun weeks whose Sunday has reached 18:00 local. */
export function recapWeeks(state: AppState, arc: Arc, now: Date): YMD[] {
  void state;
  const today = formatLocal(now);
  const out: YMD[] = [];
  for (let mon = startOfWeekMon(arc.startDate); mon <= arcEnd(arc); mon = addDays(mon, 7)) {
    const sun = addDays(mon, 6);
    const ready = sun < today || (sun === today && now.getHours() >= 18);
    if (!ready) break;
    out.push(mon);
  }
  return out;
}

export function recapKey(arcId: string, monday: YMD): string {
  return `${arcId}:${monday}`;
}

/** The newest ready week, unless it has been seen. */
export function latestRecap(state: AppState, arc: Arc, now: Date): YMD | null {
  const weeks = recapWeeks(state, arc, now);
  const last = weeks[weeks.length - 1];
  if (!last || state.ui.recapSeen.includes(recapKey(arc.id, last))) return null;
  return last;
}

function weekDays(arc: Arc, monday: YMD): YMD[] {
  const lo = maxDay(monday, arc.startDate);
  const hi = minDay(addDays(monday, 6), arcEnd(arc));
  return lo > hi ? [] : eachDay(lo, hi);
}

function weekScore(state: AppState, arc: Arc, monday: YMD): number | null {
  let done = 0;
  let sched = 0;
  for (const d of weekDays(arc, monday)) {
    const c = dailyCompletion(state, arc.id, d);
    done += c.completed;
    sched += c.scheduled;
  }
  return sched === 0 ? null : (done / sched) * 100;
}

const STEPS = [0.08, 0.25, 0.55, 1];
const size = (g: number): number => STEPS.filter((s) => g >= s).length;

export type RecapModel = {
  monday: YMD;
  sunday: YMD;
  weekNumber: number;
  score: number | null;
  previousScore: number | null;
  bestWeek: boolean;
  fullBlooms: number;
  missedDays: number;
  plantsGrew: number;
  newFlowers: number;
  birdsBefore: number;
  birdsAfter: number;
  visitors: VisitorFound[];
  highlights: {
    neverMissed: { name: string; done: number; of: number } | null;
    mostImproved: { name: string; from: number; to: number } | null;
    needsLove: { day: string; percent: number } | null;
    comingUp: string | null;
  };
};

export function recapModel(state: AppState, arc: Arc, monday: YMD, today: YMD): RecapModel {
  const sunday = addDays(monday, 6);
  const lastSunday = addDays(monday, -1);
  const days = weekDays(arc, monday);
  const prevDays = weekDays(arc, addDays(monday, -7));
  const score = weekScore(state, arc, monday);
  const previousScore = weekScore(state, arc, addDays(monday, -7));
  const allScores: number[] = [];
  for (let m = startOfWeekMon(arc.startDate); m <= monday; m = addDays(m, 7)) {
    const s = weekScore(state, arc, m);
    if (s !== null) allScores.push(s);
  }
  const habits = arcHabits(state, arc.id);
  const doneIn = (h: (typeof habits)[number], ds: YMD[]) => ds.filter((d) => isScheduled(h, d) && isDone(state, h, d)).length;
  const schedIn = (h: (typeof habits)[number], ds: YMD[]) => ds.filter((d) => isScheduled(h, d)).length;
  const gAt = (h: (typeof habits)[number], d: YMD) => growth(doneIn(h, eachDay(arc.startDate, minDay(d, arcEnd(arc))).filter((x) => x <= d)), arc.lengthDays);

  const neverMissed = habits.map((h) => ({ name: h.name, done: doneIn(h, days), of: schedIn(h, days) })).find((x) => x.of > 0 && x.done === x.of) ?? null;
  let mostImproved: RecapModel["highlights"]["mostImproved"] = null;
  for (const h of habits) {
    const from = doneIn(h, prevDays);
    const to = doneIn(h, days);
    if (to > from && (!mostImproved || to - from > mostImproved.to - mostImproved.from)) mostImproved = { name: h.name, from, to };
  }
  const bars = weekBars(state, arc, sunday < today ? sunday : today);
  const w = weakestWeekday(bars);
  const found = new Set(state.visitors.filter((x) => x.arcId === arc.id).map((x) => x.visitorId));
  const next = nextVisitor(state, arc, today, found);

  return {
    monday,
    sunday,
    weekNumber: Math.floor(diffDays(startOfWeekMon(arc.startDate), monday) / 7) + 1,
    score,
    previousScore,
    bestWeek: score !== null && allScores.length > 1 && score >= Math.max(...allScores),
    fullBlooms: days.filter((d) => isFull(state, arc, d)).length,
    missedDays: days.filter((d) => isKept(state, arc, d) === false).length,
    plantsGrew: habits.filter((h) => size(gAt(h, sunday)) > size(lastSunday < arc.startDate ? 0 : gAt(h, lastSunday))).length,
    newFlowers: days.filter((d) => isKept(state, arc, d) === true).length,
    birdsBefore: lastSunday < arc.startDate ? 0 : birdCount(arcDayNumber(arc, lastSunday) / arc.lengthDays),
    birdsAfter: birdCount(Math.min(1, arcDayNumber(arc, sunday) / arc.lengthDays)),
    visitors: state.visitors.filter((x) => x.arcId === arc.id && x.foundOn >= monday && x.foundOn <= sunday),
    highlights: {
      neverMissed,
      mostImproved,
      needsLove: w === null ? null : { day: WEEKDAY_PLURAL[w]!, percent: bars[w] ?? 0 },
      comingUp: next ? teaser(next) : null,
    },
  };
}
