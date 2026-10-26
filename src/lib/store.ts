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
