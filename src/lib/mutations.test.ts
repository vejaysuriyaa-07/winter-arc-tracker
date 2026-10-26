import { describe, expect, it } from "vitest";
import { addHabit, setCheckoff, setJournalWin, setMood, setSleep, toggleHabit } from "./mutations";
import { A, C, FIX_TODAY, fixtureState } from "./stats.fixture";

const T = FIX_TODAY;

describe("toggleHabit", () => {
  it("creates the day log lazily and checks the habit", () => {
    const s = fixtureState();
    delete s.logs[T];
    const next = toggleHabit(s, T, A);
    expect(next.logs[T]).toEqual({ date: T, completedHabitIds: [A] });
    expect(s.logs[T]).toBeUndefined(); // input untouched
  });
  it("unchecks a checked habit and keeps the rest of the log", () => {
    const s = fixtureState();
    s.logs[T] = { date: T, completedHabitIds: [A, C], mood: 3 };
    const next = toggleHabit(s, T, A);
    expect(next.logs[T]).toEqual({ date: T, completedHabitIds: [C], mood: 3 });
  });
  it("does not touch other days", () => {
    const s = fixtureState();
    const next = toggleHabit(s, T, C);
    expect(next.logs["2026-10-13"]).toBe(s.logs["2026-10-13"]);
  });
});

describe("addHabit", () => {
  it("appends at the end, scheduled from today", () => {
    const s = fixtureState();
    const next = addHabit(s, T, { name: "  Stretch ", category: "body" });
    const added = next.habits[next.habits.length - 1]!;
    expect(added).toMatchObject({ name: "Stretch", category: "body", order: 5, createdAt: T });
    expect(added.id).not.toBe("");
    expect(added.detail).toBeUndefined();
    expect(next.habits).toHaveLength(6);
  });
  it("keeps a trimmed detail and drops an empty one", () => {
    const s = fixtureState();
    expect(addHabit(s, T, { name: "Read", detail: " 20 pages ", category: "mind" }).habits.at(-1)!.detail).toBe(
      "20 pages",
    );
    expect(addHabit(s, T, { name: "Read", detail: "  ", category: "mind" }).habits.at(-1)!.detail).toBeUndefined();
  });
  it("ignores an empty name", () => {
    const s = fixtureState();
    expect(addHabit(s, T, { name: "   ", category: "custom" })).toBe(s);
  });
});

describe("check-in fields", () => {
  it("sets mood, sleep and the win on the day log", () => {
    const s = fixtureState();
    let next = setMood(s, T, 4);
    next = setSleep(next, T, { hours: 7.5, quality: 3 });
    next = setJournalWin(next, T, "Ran 5k");
    expect(next.logs[T]).toMatchObject({ mood: 4, sleepHours: 7.5, sleepQuality: 3, journalWin: "Ran 5k" });
    expect(next.logs[T]!.completedHabitIds).toEqual([A]);
  });
  it("clears a field when given undefined and creates a log when missing", () => {
    const s = fixtureState();
    delete s.logs[T];
    let next = setSleep(s, T, { hours: 6 });
    expect(next.logs[T]).toEqual({ date: T, completedHabitIds: [], sleepHours: 6 });
    next = setSleep(next, T, { hours: undefined, quality: 2 });
    expect(next.logs[T]).toEqual({ date: T, completedHabitIds: [], sleepQuality: 2 });
    next = setMood(next, T, undefined);
    expect(next.logs[T]!.mood).toBeUndefined();
    next = setJournalWin(next, T, "");
    expect(next.logs[T]!.journalWin).toBeUndefined();
  });
});

describe("setCheckoff", () => {
  it("is idempotent and returns the same state when nothing changes", () => {
    const s = fixtureState();
    expect(setCheckoff(s, T, A, true)).toBe(s); // already checked
    const off = setCheckoff(s, T, A, false);
    expect(off.logs[T]!.completedHabitIds).toEqual([]);
    expect(setCheckoff(off, T, A, false)).toBe(off);
    expect(setCheckoff(off, T, A, true).logs[T]!.completedHabitIds).toEqual([A]);
  });
});

describe("no-op writes keep identity", () => {
  it("returns the same state when a field already has the value", () => {
    const s = setMood(fixtureState(), T, 4);
    expect(setMood(s, T, 4)).toBe(s);
    const w = setJournalWin(s, T, "  Ran 5k ");
    expect(w.logs[T]!.journalWin).toBe("Ran 5k");
    expect(setJournalWin(w, T, "Ran 5k")).toBe(w);
    expect(setJournalWin(w, T, " Ran 5k  ")).toBe(w);
    const cleared = setJournalWin(w, T, "");
    expect(cleared.logs[T]!.journalWin).toBeUndefined();
    expect(setJournalWin(cleared, T, "")).toBe(cleared);
  });
  it("still creates the log when clearing a field on a day without one", () => {
    const s = fixtureState();
    delete s.logs[T];
    expect(setMood(s, T, undefined).logs[T]).toEqual({ date: T, completedHabitIds: [] });
  });
  it("never mutates its input", () => {
    const s = fixtureState();
    const snapshot = JSON.stringify(s);
    addHabit(s, T, { name: "X", category: "custom" });
    setMood(s, T, 1);
    setSleep(s, T, { hours: 1, quality: 1 });
    setJournalWin(s, T, "y");
    setCheckoff(s, T, C, true);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
