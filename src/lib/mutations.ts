// Pure state transitions. The store applies these; tests call them directly.
// Each returns the same object when nothing changes.
import type { AppState, ArcSettings, Category, DayLog, Goal, Habit, Rating } from "../types";
import { isValidYMD, type YMD } from "./dates";
import { newId } from "./storage";

function logFor(state: AppState, date: YMD): DayLog {
  return state.logs[date] ?? { date, completedHabitIds: [] };
}

function withLog(state: AppState, log: DayLog): AppState {
  return { ...state, logs: { ...state.logs, [log.date]: log } };
}

export function toggleHabit(state: AppState, date: YMD, habitId: string): AppState {
  const log = logFor(state, date);
  const done = log.completedHabitIds.includes(habitId);
  const completedHabitIds = done
    ? log.completedHabitIds.filter((id) => id !== habitId)
    : [...log.completedHabitIds, habitId];
  return withLog(state, { ...log, completedHabitIds });
}

export function setCheckoff(state: AppState, date: YMD, habitId: string, checked: boolean): AppState {
  const done = logFor(state, date).completedHabitIds.includes(habitId);
  return done === checked ? state : toggleHabit(state, date, habitId);
}

export type NewHabit = { name: string; detail?: string | undefined; category: Category };

export function addHabit(state: AppState, today: YMD, input: NewHabit): AppState {
  const name = input.name.trim();
  if (name === "") return state;
  const detail = input.detail?.trim();
  const order = state.habits.reduce((m, h) => Math.max(m, h.order), -1) + 1;
  const habit: Habit = { id: newId(), name, category: input.category, order, createdAt: today };
  if (detail) habit.detail = detail;
  return { ...state, habits: [...state.habits, habit] };
}

function setField<K extends keyof DayLog>(state: AppState, date: YMD, key: K, value: DayLog[K] | undefined): AppState {
  const current = logFor(state, date);
  const next = value === undefined || value === "" ? undefined : value;
  if (current[key] === next && (next !== undefined || state.logs[date] !== undefined)) return state;
  const log = { ...current };
  if (next === undefined) delete log[key];
  else log[key] = next;
  return withLog(state, log);
}

export function setMood(state: AppState, date: YMD, mood: Rating | undefined): AppState {
  return setField(state, date, "mood", mood);
}

export type SleepInput = { hours?: number | undefined; quality?: Rating | undefined };

/** Sets the fields present in `input`; a field given as undefined is cleared. */
export function setSleep(state: AppState, date: YMD, input: SleepInput): AppState {
  let next = state;
  if ("hours" in input) next = setField(next, date, "sleepHours", input.hours);
  if ("quality" in input) next = setField(next, date, "sleepQuality", input.quality);
  return next;
}

export function setJournalWin(state: AppState, date: YMD, text: string | undefined): AppState {
  return setField(state, date, "journalWin", text?.trim() || undefined);
}

// ---------- goals ----------

export function addGoal(state: AppState, today: YMD, input: { name: string; target: number }): AppState {
  const name = input.name.trim();
  if (name === "" || !Number.isFinite(input.target) || input.target <= 0) return state;
  const goal: Goal = { id: newId(), name, target: Math.round(input.target), current: 0, createdAt: today };
  return { ...state, goals: [...state.goals, goal] };
}

export function incGoal(state: AppState, goalId: string, delta: number): AppState {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return state;
  const current = Math.max(0, goal.current + delta);
  if (current === goal.current) return state;
  return { ...state, goals: state.goals.map((g) => (g.id === goalId ? { ...g, current } : g)) };
}

export function removeGoal(state: AppState, goalId: string): AppState {
  if (!state.goals.some((g) => g.id === goalId)) return state;
  return { ...state, goals: state.goals.filter((g) => g.id !== goalId) };
}

// ---------- settings ----------

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Habits created on or before the old start date move with it, so they stay scheduled from day 1. */
function moveStart(habits: readonly Habit[], oldStart: YMD, newStart: YMD): Habit[] {
  return habits.map((h) => (h.createdAt <= oldStart ? { ...h, createdAt: newStart } : h));
}

export function updateSettings(state: AppState, patch: Partial<ArcSettings>): AppState {
  const cur = state.settings;
  const next: ArcSettings = {
    startDate: patch.startDate !== undefined && isValidYMD(patch.startDate) ? patch.startDate : cur.startDate,
    lengthDays: patch.lengthDays === undefined ? cur.lengthDays : clamp(Math.round(patch.lengthDays), 1, 3650),
    streakThreshold: patch.streakThreshold === undefined ? cur.streakThreshold : clamp(Math.round(patch.streakThreshold), 0, 100),
    sleepTargetHours: patch.sleepTargetHours === undefined ? cur.sleepTargetHours : clamp(patch.sleepTargetHours, 0.5, 24),
  };
  if (
    next.startDate === cur.startDate &&
    next.lengthDays === cur.lengthDays &&
    next.streakThreshold === cur.streakThreshold &&
    next.sleepTargetHours === cur.sleepTargetHours
  )
    return state;
  const habits = next.startDate === cur.startDate ? state.habits : moveStart(state.habits, cur.startDate, next.startDate);
  return { ...state, settings: next, habits };
}

// ---------- habit management ----------

export type HabitPatch = { name?: string; detail?: string | undefined; category?: Category };

export function editHabit(state: AppState, habitId: string, patch: HabitPatch): AppState {
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return state;
  const next: Habit = { ...habit };
  if (patch.name !== undefined && patch.name.trim() !== "") next.name = patch.name.trim();
  if (patch.category !== undefined) next.category = patch.category;
  if ("detail" in patch) {
    const d = patch.detail?.trim();
    if (d) next.detail = d;
    else delete next.detail;
  }
  return { ...state, habits: state.habits.map((h) => (h.id === habitId ? next : h)) };
}

/** Swap list positions with the neighbour above (-1) or below (+1), among active habits. */
export function moveHabit(state: AppState, habitId: string, dir: -1 | 1): AppState {
  const active = state.habits.filter((h) => h.archivedAt === undefined).sort((a, b) => a.order - b.order);
  const i = active.findIndex((h) => h.id === habitId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= active.length) return state;
  const a = active[i]!;
  const b = active[j]!;
  return {
    ...state,
    habits: state.habits.map((h) => (h.id === a.id ? { ...h, order: b.order } : h.id === b.id ? { ...h, order: a.order } : h)),
  };
}

/** A habit never scheduled on a past day can go completely without changing any past percentage. */
export function isHardDeletable(habit: Habit, today: YMD): boolean {
  return habit.createdAt >= today;
}

/**
 * Hard delete only when the habit was never scheduled on a past day (createdAt >= today).
 * Otherwise archive it from today, so no past day's percentage can change.
 */
export function deleteHabit(state: AppState, today: YMD, habitId: string): AppState {
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return state;
  if (isHardDeletable(habit, today)) {
    const logs: Record<string, DayLog> = {};
    for (const [date, log] of Object.entries(state.logs)) {
      logs[date] = log.completedHabitIds.includes(habitId)
        ? { ...log, completedHabitIds: log.completedHabitIds.filter((id) => id !== habitId) }
        : log;
    }
    return { ...state, habits: state.habits.filter((h) => h.id !== habitId), logs };
  }
  if (habit.archivedAt !== undefined) return state;
  return { ...state, habits: state.habits.map((h) => (h.id === habitId ? { ...h, archivedAt: today } : h)) };
}

// ---------- reset ----------

/** Clears every day log, starts the arc today, keeps goals and active habits. */
export function resetArc(state: AppState, today: YMD): AppState {
  const kept = state.habits.filter((h) => h.archivedAt === undefined);
  return {
    ...state,
    settings: { ...state.settings, startDate: today },
    habits: moveStart(kept, state.settings.startDate, today),
    logs: {},
    ui: { lastCelebratedLevel: 1 },
  };
}
