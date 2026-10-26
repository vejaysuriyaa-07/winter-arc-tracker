// One app store: in-memory AppState, persisted through storage.ts, read with
// useSyncExternalStore so every screen updates live. Mutations go through
// `update`, which writes through to storage and notifies subscribers.
import { useSyncExternalStore } from "react";
import type { AppState } from "../types";
import { todayLocal } from "./dates";
import { STORAGE_KEY, load, save } from "./storage";

type Listener = () => void;

let state: AppState | null = null;
const listeners = new Set<Listener>();

function ensure(): AppState {
  if (state === null) state = load(todayLocal());
  return state;
}

export function getState(): AppState {
  return ensure();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  for (const l of listeners) l();
}

/** Replace the state wholesale (import, reset) and persist it. */
export function replaceState(next: AppState): void {
  state = next;
  save(next);
  emit();
}

/** Apply a pure updater; identical results are ignored. */
export function update(fn: (s: AppState) => AppState): void {
  const prev = ensure();
  const next = fn(prev);
  if (next === prev) return;
  replaceState(next);
}

/** Drop the cached state so the next read loads from storage (tests, cross-tab). */
export function reloadFromStorage(): void {
  state = load(todayLocal());
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === null) reloadFromStorage();
  });
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ---------- actions ----------
import * as m from "./mutations";
import { level, lifetimeCheckoffs } from "./stats";
import type { ArcSettings, Rating } from "../types";
import type { YMD } from "./dates";

export const actions = {
  toggleHabit: (date: YMD, habitId: string) => update((s) => m.toggleHabit(s, date, habitId)),
  setCheckoff: (date: YMD, habitId: string, checked: boolean) =>
    update((s) => m.setCheckoff(s, date, habitId, checked)),
  addHabit: (today: YMD, input: m.NewHabit) => update((s) => m.addHabit(s, today, input)),
  setMood: (date: YMD, mood: Rating | undefined) => update((s) => m.setMood(s, date, mood)),
  setSleep: (date: YMD, input: m.SleepInput) => update((s) => m.setSleep(s, date, input)),
  setJournalWin: (date: YMD, text: string | undefined) => update((s) => m.setJournalWin(s, date, text)),
  addGoal: (today: YMD, input: { name: string; target: number }) => update((s) => m.addGoal(s, today, input)),
  incGoal: (goalId: string, delta: number) => update((s) => m.incGoal(s, goalId, delta)),
  removeGoal: (goalId: string) => update((s) => m.removeGoal(s, goalId)),
  updateSettings: (patch: Partial<ArcSettings>) => update((s) => m.updateSettings(s, patch)),
  editHabit: (habitId: string, patch: m.HabitPatch) => update((s) => m.editHabit(s, habitId, patch)),
  moveHabit: (habitId: string, dir: -1 | 1) => update((s) => m.moveHabit(s, habitId, dir)),
  deleteHabit: (today: YMD, habitId: string) => update((s) => m.deleteHabit(s, today, habitId)),
  resetArc: (today: YMD) => update((s) => m.resetArc(s, today)),
  /** Imported data never toasts: its level is marked celebrated before it lands (DECISIONS 5). */
  importState: (next: AppState) => replaceState(m.syncCelebratedLevel(next, level(lifetimeCheckoffs(next)))),
  markCelebratedLevel: (level: number) =>
    update((s) => (s.ui.lastCelebratedLevel === level ? s : { ...s, ui: { lastCelebratedLevel: level } })),
};
