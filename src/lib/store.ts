// One app store: in-memory AppState, persisted through storage.ts, read with
// useSyncExternalStore so every screen updates live. Mutations go through
// `update`, which notifies subscribers and writes through to storage.
// `initStore` must resolve before the first render (main.tsx awaits it).
import { useSyncExternalStore } from "react";
import type { AppState, Look, Mood } from "../types";
import { todayLocal, type YMD } from "./dates";
import * as m from "./mutations";
import { markFinishedCelebrated } from "./arcs";
import { STORAGE_KEY, defaultState, load, save, webAdapter, type StorageAdapter } from "./storage";

type Listener = () => void;

let adapter: StorageAdapter = webAdapter();
let state: AppState | null = null;
let saveFailed = false;
let writes: Promise<unknown> = Promise.resolve();
/** Set when storage could not be read: nothing is written, so unread data is never overwritten. */
let readOnly = false;
const listeners = new Set<Listener>();

const nowIso = (): string => new Date().toISOString();

export async function initStore(a: StorageAdapter = webAdapter()): Promise<AppState> {
  adapter = a;
  readOnly = false;
  try {
    state = await load(adapter, todayLocal(), nowIso());
    saveFailed = false;
  } catch {
    state = defaultState(nowIso());
    readOnly = true;
    saveFailed = true;
  }
  emit();
  // Persist right away so a migrated v1 state lands under the v3 key.
  persist(state);
  return state;
}

export function getState(): AppState {
  if (state === null) state = defaultState(nowIso()); // only before initStore, e.g. in isolated tests
  return state;
}

/** True when the last write to storage was refused; the UI warns that progress is not being kept. */
export function lastSaveFailed(): boolean {
  return saveFailed;
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

function persist(next: AppState): void {
  if (readOnly) return;
  // Writes are chained so an older state can never land after a newer one.
  writes = writes.then(async () => {
    const ok = await save(adapter, next);
    if (state !== next) return; // a newer write is queued; it decides the flag
    if (saveFailed === !ok) return;
    saveFailed = !ok;
    emit();
  });
}

/** Wait for queued writes (tests, before export). */
export function flushWrites(): Promise<unknown> {
  return writes;
}

/** Replace the state wholesale (import, sync pull), notify, then persist. */
export function replaceState(next: AppState): void {
  state = next;
  emit();
  persist(next);
}

/** Apply a pure updater; identical results are ignored. */
export function update(fn: (s: AppState) => AppState): void {
  const prev = getState();
  const next = fn(prev);
  if (next === prev) return;
  replaceState(next);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    void load(adapter, todayLocal(), nowIso()).then((s) => {
      state = s;
      emit();
    });
  });
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Reactive view of lastSaveFailed(). */
export function useSaveFailed(): boolean {
  return useSyncExternalStore(subscribe, lastSaveFailed, lastSaveFailed);
}

// ---------- actions ----------

const u = (fn: (s: AppState, now: string) => AppState): void => update((s) => fn(s, nowIso()));

export const actions = {
  toggleHabit: (arcId: string, date: YMD, habitId: string) => u((s, n) => m.toggleHabit(s, n, arcId, date, habitId)),
  setCheckoff: (arcId: string, date: YMD, habitId: string, checked: boolean) =>
    u((s, n) => m.setCheckoff(s, n, arcId, date, habitId, checked)),
  setMood: (arcId: string, date: YMD, mood: Mood | undefined) => u((s, n) => m.setMood(s, n, arcId, date, mood)),
  addHabit: (today: YMD, arcId: string, input: m.NewHabit) => u((s, n) => m.addHabit(s, n, today, arcId, input)),
  editHabit: (habitId: string, patch: m.HabitPatch) => u((s, n) => m.editHabit(s, n, habitId, patch)),
  reorderHabits: (arcId: string, ids: string[]) => u((s, n) => m.reorderHabits(s, n, arcId, ids)),
  removeHabit: (today: YMD, habitId: string) => u((s, n) => m.removeHabit(s, n, today, habitId)),
  restoreHabit: (today: YMD, habitId: string) => u((s, n) => m.restoreHabit(s, n, today, habitId)),
  createArc: (input: m.NewArc) => u((s, n) => m.createArc(s, n, input)),
  updateArc: (arcId: string, patch: m.ArcPatch) => u((s, n) => m.updateArc(s, n, arcId, patch)),
  setTheme: (arcId: string, look: Look, season: AppState["arcs"][number]["season"]) =>
    u((s, n) => m.updateArc(s, n, arcId, { look, season })),
  setActiveArc: (arcId: string) => update((s) => m.setActiveArc(s, arcId)),
  freezeArc: (arcId: string) => u((s, n) => m.freezeArc(s, n, arcId)),
  deleteArc: (arcId: string) => u((s, n) => m.deleteArc(s, n, arcId)),
  resetArc: (today: YMD, arcId: string) => u((s, n) => m.resetArc(s, n, today, arcId)),
  updateSettings: (patch: m.SettingsPatch) => u((s, n) => m.updateSettings(s, n, patch)),
  addVisitor: (arcId: string, visitorId: string, foundOn: YMD) => u((s, n) => m.addVisitor(s, n, arcId, visitorId, foundOn)),
  markCelebrated: (key: string) => update((s) => m.markCelebrated(s, key)),
  markRecapSeen: (key: string) => update((s) => m.markRecapSeen(s, key)),
  setUiFlag: (flag: "signInPrompted" | "notificationsPrompted", value: boolean) => update((s) => m.setUiFlag(s, flag, value)),
  /** Imported history never celebrates on load: arcs already finished are marked celebrated. */
  importState: (next: AppState) => replaceState(markFinishedCelebrated(next, todayLocal())),
};
