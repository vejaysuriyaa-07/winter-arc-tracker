import { beforeEach, describe, expect, it } from "vitest";
import {
  BACKUP_KEY,
  DEFAULT_HABITS,
  STORAGE_KEY,
  defaultState,
  load,
  parseImport,
  save,
  serialize,
  validateState,
} from "./storage";
import type { AppState } from "../types";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const TODAY = "2026-10-25";

/** Default states get fresh random ids, so compare them with ids blanked. */
function withoutIds(s: AppState): AppState {
  return { ...s, habits: s.habits.map((h) => ({ ...h, id: "" })) };
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
});

describe("defaultState", () => {
  it("has the 9 default habits scheduled from the arc start", () => {
    const s = defaultState(TODAY);
    expect(s.version).toBe(1);
    expect(s.habits).toHaveLength(9);
    expect(s.habits.map((h) => h.name)).toEqual(DEFAULT_HABITS.map((h) => h.name));
    expect(s.habits.every((h) => h.createdAt === TODAY)).toBe(true);
    expect(s.habits.map((h) => h.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(s.habits.map((h) => h.id)).size).toBe(9);
    expect(s.habits[3]).toMatchObject({ name: "Read", detail: "10 pages", category: "mind" });
  });
  it("starts a 90-day arc today with default thresholds", () => {
    const s = defaultState(TODAY);
    expect(s.settings).toEqual({
      startDate: TODAY,
      lengthDays: 90,
      streakThreshold: 80,
      sleepTargetHours: 8,
    });
    expect(s.logs).toEqual({});
    expect(s.goals).toEqual([]);
    expect(s.ui.lastCelebratedLevel).toBe(1);
  });
});

describe("save / load", () => {
  it("round-trips through localStorage", () => {
    const s = defaultState(TODAY);
    s.logs[TODAY] = { date: TODAY, completedHabitIds: [s.habits[0]!.id], mood: 4 };
    save(s);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(load(TODAY)).toEqual(s);
  });
  it("returns defaults when nothing is stored", () => {
    expect(withoutIds(load(TODAY))).toEqual(withoutIds(defaultState(TODAY)));
  });
  it("returns defaults when the stored value is corrupt", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(withoutIds(load(TODAY))).toEqual(withoutIds(defaultState(TODAY)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, habits: "nope" }));
    expect(withoutIds(load(TODAY))).toEqual(withoutIds(defaultState(TODAY)));
  });
  it("keeps a backup of corrupt data instead of losing it", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    load(TODAY);
    expect(localStorage.getItem(BACKUP_KEY)).toBe("{not json");
  });
});

describe("validateState", () => {
  const valid = (): AppState => defaultState(TODAY);

  it("accepts a valid state", () => {
    const r = validateState(valid());
    expect(r.ok).toBe(true);
  });
  it("rejects a non-object", () => {
    expect(validateState(null).ok).toBe(false);
    expect(validateState("x").ok).toBe(false);
  });
  it("rejects an unknown version", () => {
    const r = validateState({ ...valid(), version: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/version/i);
  });
  it("rejects a bad habit", () => {
    const s = valid();
    s.habits[0] = { ...s.habits[0]!, category: "food" as never };
    expect(validateState(s).ok).toBe(false);
    const t = valid();
    t.habits[0] = { ...t.habits[0]!, createdAt: "yesterday" };
    expect(validateState(t).ok).toBe(false);
  });
  it("rejects a bad log", () => {
    const s = valid();
    s.logs["2026-10-20"] = { date: "2026-10-21", completedHabitIds: [] };
    expect(validateState(s).ok).toBe(false);
    const t = valid();
    t.logs["2026-10-20"] = { date: "2026-10-20", completedHabitIds: [], mood: 7 as never };
    expect(validateState(t).ok).toBe(false);
  });
  it("rejects bad settings and ui", () => {
    const s = valid();
    s.settings.lengthDays = 0;
    expect(validateState(s).ok).toBe(false);
    const t = valid();
    t.ui = { lastCelebratedLevel: -1 };
    expect(validateState(t).ok).toBe(false);
  });
  it("rejects a bad goal", () => {
    const s = valid();
    s.goals.push({ id: "g", name: "Books", target: -1, current: 0, createdAt: TODAY });
    expect(validateState(s).ok).toBe(false);
    const t = valid();
    t.goals.push({ id: "g", name: "Books", target: 0, current: 0, createdAt: TODAY });
    expect(validateState(t).ok).toBe(false); // 0 would make progress 0/0
  });
});

describe("validation holes", () => {
  const valid = (): AppState => defaultState(TODAY);
  it("rejects duplicate habit and goal ids", () => {
    const s = valid();
    s.habits[1] = { ...s.habits[1]!, id: s.habits[0]!.id };
    const r = validateState(s);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/duplicate/i);
    const t = valid();
    t.goals.push({ id: "g", name: "A", target: 1, current: 0, createdAt: TODAY });
    t.goals.push({ id: "g", name: "B", target: 1, current: 0, createdAt: TODAY });
    expect(validateState(t).ok).toBe(false);
  });
  it("rejects archivedAt before createdAt", () => {
    const s = valid();
    s.habits[0] = { ...s.habits[0]!, archivedAt: "2026-10-01" };
    expect(validateState(s).ok).toBe(false);
    const t = valid();
    t.habits[0] = { ...t.habits[0]!, archivedAt: TODAY }; // same day is allowed (never scheduled)
    expect(validateState(t).ok).toBe(true);
  });
  it("rejects fractional order and celebrated level", () => {
    const s = valid();
    s.habits[0] = { ...s.habits[0]!, order: 0.5 };
    expect(validateState(s).ok).toBe(false);
    const t = valid();
    t.ui = { lastCelebratedLevel: 1.5 };
    expect(validateState(t).ok).toBe(false);
  });
  it("strips unknown fields and drops check-offs of unknown habits", () => {
    const s = valid();
    const raw = JSON.parse(serialize(s)) as Record<string, unknown>;
    raw.extra = 1;
    (raw.habits as Record<string, unknown>[])[0]!.colour = "red";
    (raw.logs as Record<string, unknown>)[TODAY] = { date: TODAY, completedHabitIds: [s.habits[0]!.id, "ghost"], note: "x" };
    const r = validateState(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect("extra" in r.state).toBe(false);
      expect("colour" in r.state.habits[0]!).toBe(false);
      expect(r.state.logs[TODAY]).toEqual({ date: TODAY, completedHabitIds: [s.habits[0]!.id] });
    }
  });
  it("names the problem for a wrong-shape file", () => {
    const r = parseImport(JSON.stringify({ hello: "world" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/version/i);
  });
});

describe("save resilience", () => {
  it("returns false instead of throwing when storage is full", () => {
    const s = defaultState(TODAY);
    localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => save(s)).not.toThrow();
    expect(save(s)).toBe(false);
  });
  it("keeps the first backup rather than overwriting it", () => {
    localStorage.setItem(STORAGE_KEY, "{first");
    load(TODAY);
    localStorage.setItem(STORAGE_KEY, "{second");
    load(TODAY);
    expect(localStorage.getItem(BACKUP_KEY)).toBe("{first");
  });
});

describe("serialize / parseImport", () => {
  it("round-trips a state", () => {
    const s = defaultState(TODAY);
    const r = parseImport(serialize(s));
    expect(r).toEqual({ ok: true, state: s });
  });
  it("rejects invalid JSON with a clear error", () => {
    const r = parseImport("{oops");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/JSON/);
  });
  it("rejects a valid JSON file of the wrong shape", () => {
    const r = parseImport(JSON.stringify({ hello: "world" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });
});
