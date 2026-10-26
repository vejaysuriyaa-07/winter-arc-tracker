// Pure state transitions. The store applies these; tests call them directly.
// Each returns the same object when nothing changes.
import type { AppState, Category, DayLog, Habit, Rating } from "../types";
import type { YMD } from "./dates";
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
