import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY, defaultState } from "./storage";

const TODAY = "2026-10-25";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

beforeEach(() => {
  vi.resetModules();
  Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true, writable: true });
});

describe("store", () => {
  it("returns a stable snapshot until an update changes it", async () => {
    const store = await import("./store");
    const a = store.getState();
    expect(store.getState()).toBe(a);
    store.update((s) => s);
    expect(store.getState()).toBe(a);
    store.update((s) => ({ ...s, goals: [] }));
    expect(store.getState()).not.toBe(a);
  });
  it("notifies subscribers and persists", async () => {
    const store = await import("./store");
    const seen: number[] = [];
    const unsub = store.subscribe(() => seen.push(store.getState().habits.length));
    store.update((s) => ({ ...s, habits: s.habits.slice(0, 3) }));
    expect(seen).toEqual([3]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).habits).toHaveLength(3);
    unsub();
    store.update((s) => ({ ...s, habits: [] }));
    expect(seen).toEqual([3]);
  });
  it("keeps memory and screen in sync even when saving throws", async () => {
    localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    const store = await import("./store");
    let notified = 0;
    store.subscribe(() => notified++);
    expect(() => store.update((s) => ({ ...s, habits: [] }))).not.toThrow();
    expect(store.getState().habits).toEqual([]);
    expect(notified).toBe(1);
    expect(store.lastSaveFailed()).toBe(true);
  });
  it("clears the save-failed flag on the next successful save and notifies both times", async () => {
    const original = localStorage.setItem.bind(localStorage);
    let fail = true;
    localStorage.setItem = (k: string, v: string) => {
      if (fail) throw new Error("QuotaExceededError");
      original(k, v);
    };
    const store = await import("./store");
    const flags: boolean[] = [];
    store.subscribe(() => flags.push(store.lastSaveFailed()));
    store.update((s) => ({ ...s, goals: [] }));
    expect(store.lastSaveFailed()).toBe(true);
    fail = false;
    store.update((s) => ({ ...s, habits: [] }));
    expect(store.lastSaveFailed()).toBe(false);
    expect(flags).toEqual([true, false]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).habits).toEqual([]);
  });
  it("replaceState persists an imported state", async () => {
    const store = await import("./store");
    const next = defaultState(TODAY);
    next.habits = next.habits.slice(0, 2);
    store.replaceState(next);
    expect(store.getState()).toBe(next);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).habits).toHaveLength(2);
  });
});
