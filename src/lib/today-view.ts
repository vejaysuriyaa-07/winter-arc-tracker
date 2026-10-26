// What the Garden tab shows for one arc on one day. Pure: `today` is passed in.
import type { AppState, Arc, Habit, Mood, Season } from "../types";
import { diffDays, type YMD } from "./dates";
import { arcEnd, arcPhase, arcHabits, chain, dailyCompletion, habitStreak, isDone, isScheduled, logOf, type ArcPhase } from "./stats";

// ---------- streak icons (SPEC 4.2, Skin.dc.html animIcons) ----------

export type IconKind = "seed" | "sprout" | "flame";

export type IconSpec = {
  kind: IconKind;
  spark: boolean;
  cloud: boolean;
  drop: boolean;
  flake: boolean;
  bolt: boolean;
  wet: boolean;
  rough: boolean;
  wind: number;
};

const WIND: Record<Mood, number> = { great: 0.8, good: 1, okay: 0.9, low: 1.3, rough: 2.3 };

export function iconFor(streak: number, mood: Mood, season: Season): IconSpec {
  const kind: IconKind = streak <= 0 ? "seed" : streak >= 7 ? "flame" : "sprout";
  const wetMood = mood === "low" || mood === "rough";
  const winter = season === "winter";
  return {
    kind,
    spark: mood === "great",
    cloud: mood === "okay",
    drop: wetMood && !winter && kind !== "seed",
    flake: wetMood && winter,
    bolt: mood === "rough",
    wet: wetMood && !winter,
    rough: mood === "rough",
    wind: WIND[mood],
  };
}

export function moodLabel(mood: Mood, season: Season): string {
  const snow = season === "winter";
  return {
    great: "Great, sunny",
    good: "Good, clear skies",
    okay: "Okay, cloudy",
    low: snow ? "Low, snowing" : "Low, rainy",
    rough: snow ? "Rough, blizzard" : "Rough, stormy",
  }[mood];
}

// ---------- celebrations ----------

export function bloomKey(arcId: string, date: YMD): string {
  return `bloom:${arcId}:${date}`;
}

/** Full bloom plays on a live change into a full day, once per arc and day (never on load). */
export function shouldPlayFullBloom(wasFull: boolean, isFull: boolean, key: string, celebrated: Record<string, boolean>): boolean {
  return !wasFull && isFull && !celebrated[key];
}

// ---------- the view ----------

export type HabitRowView = { habit: Habit; done: boolean; streak: number };

export type TodayView = {
  phase: ArcPhase;
  /** The day the rows and garden show: today, or the arc's last day once it is over. */
  day: YMD;
  startsIn: number;
  rows: HabitRowView[];
  done: number;
  total: number;
  percent: number;
  mood: Mood;
  chain: number;
  canCheck: boolean;
};

export function todayView(state: AppState, arc: Arc, today: YMD): TodayView {
  const phase = arcPhase(arc, today);
  const day = phase === "complete" ? arcEnd(arc) : phase === "before" ? arc.startDate : today;
  const habits = arcHabits(state, arc.id).filter((h) => isScheduled(h, day));
  const rows = habits.map((habit) => ({
    habit,
    done: phase !== "before" && isDone(state, habit, day),
    streak: phase === "before" ? 0 : habitStreak(state, habit, day),
  }));
  const c = dailyCompletion(state, arc.id, day);
  return {
    phase,
    day,
    startsIn: phase === "before" ? diffDays(today, arc.startDate) : 0,
    rows,
    done: phase === "before" ? 0 : c.completed,
    total: rows.length,
    percent: phase === "before" ? 0 : (c.percent ?? 0),
    mood: logOf(state, arc.id, day)?.mood ?? "good",
    chain: chain(state, arc, day),
    canCheck: phase === "active",
  };
}
