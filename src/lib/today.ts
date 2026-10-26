// Midnight rollover: the current local day, re-read on focus, on
// visibilitychange and once a minute so an app left open overnight moves on.
import { useSyncExternalStore } from "react";
import { todayLocal, type YMD } from "./dates";

let current: YMD = todayLocal();
const listeners = new Set<() => void>();
let started = false;

function check(): void {
  const next = todayLocal();
  if (next !== current) {
    current = next;
    for (const l of listeners) l();
  }
}

function start(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", check);
  window.setInterval(check, 60_000);
}

function subscribe(l: () => void): () => void {
  start();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function get(): YMD {
  return current;
}

export function useToday(): YMD {
  return useSyncExternalStore(subscribe, get, get);
}
