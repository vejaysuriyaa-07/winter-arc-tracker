// Midnight rollover: the current local day, re-read on focus, on
// visibilitychange and once a minute so an app left open overnight moves on.
import { useSyncExternalStore } from "react";
import { todayLocal, type YMD } from "./dates";

let current: YMD = todayLocal();
let nowValue = new Date();
let nowMinute = Math.floor(nowValue.getTime() / 60_000);
const listeners = new Set<() => void>();
const nowListeners = new Set<() => void>();
let started = false;

function check(): void {
  const d = new Date();
  const minute = Math.floor(d.getTime() / 60_000);
  if (minute !== nowMinute) {
    nowMinute = minute;
    nowValue = d;
    for (const l of nowListeners) l();
  }
  const next = todayLocal(d);
  if (next !== current) {
    current = next;
    for (const l of listeners) l();
  }
}

function start(): void {
  if (started) return;
  started = true;
  check(); // the module may have loaded on an earlier day than the first subscriber
  if (typeof window !== "undefined") {
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
  }
  setInterval(check, 60_000);
}

export function subscribeToday(l: () => void): () => void {
  start();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function currentDay(): YMD {
  return current;
}

export function useToday(): YMD {
  return useSyncExternalStore(subscribeToday, currentDay, currentDay);
}

/** The local time, refreshed once a minute (night skies, the Sunday 18:00 recap). */
export function useNow(): Date {
  return useSyncExternalStore(
    (l) => {
      start();
      nowListeners.add(l);
      return () => {
        nowListeners.delete(l);
      };
    },
    () => nowValue,
    () => nowValue,
  );
}
