import { describe, expect, it } from "vitest";
import {
  addGoal,
  deleteHabit,
  editHabit,
  incGoal,
  moveHabit,
  removeGoal,
  resetArc,
  updateSettings,
} from "./mutations";
import { arcDaysSoFar, dailyCompletion, scheduledHabits } from "./stats";
import { A, B, C, D, FIX_TODAY, Z, fixtureState } from "./stats.fixture";

const T = FIX_TODAY;

describe("goals", () => {
  it("adds, counts and removes", () => {
    let s = addGoal(fixtureState(), T, { name: " Books ", target: 12 });
    const g = s.goals[0]!;
    expect(g).toMatchObject({ name: "Books", target: 12, current: 0, createdAt: T });
    s = incGoal(s, g.id, 1);
    s = incGoal(s, g.id, 1);
    expect(s.goals[0]!.current).toBe(2);
    s = incGoal(s, g.id, -5);
    expect(s.goals[0]!.current).toBe(0); // never below zero
    expect(incGoal(s, g.id, -1)).toBe(s);
    expect(removeGoal(s, g.id).goals).toEqual([]);
  });
  it("ignores an empty name or a non-positive target", () => {
    const s = fixtureState();
    expect(addGoal(s, T, { name: "", target: 3 })).toBe(s);
    expect(addGoal(s, T, { name: "X", target: 0 })).toBe(s);
  });
});

describe("updateSettings", () => {
  it("moves habits created on or before the old start to the new start", () => {
    const s = fixtureState(); // start 10-05; A,B,C created 10-05; D 10-08; Z 10-20
    const next = updateSettings(s, { startDate: "2026-10-10" });
    const by = (id: string) => next.habits.find((h) => h.id === id)!;
    expect(by(A).createdAt).toBe("2026-10-10");
    expect(by(B).createdAt).toBe("2026-10-10");
    expect(by(C).createdAt).toBe("2026-10-10");
    expect(by(D).createdAt).toBe("2026-10-08"); // created after the old start: untouched
    expect(by(Z).createdAt).toBe("2026-10-20");
    expect(next.settings.startDate).toBe("2026-10-10");
  });
  it("leaves habits alone when the start date moves earlier", () => {
    const s = fixtureState();
    const next = updateSettings(s, { startDate: "2026-10-01" });
    expect(next.habits.map((h) => h.createdAt)).toEqual(["2026-10-01", "2026-10-01", "2026-10-01", "2026-10-08", "2026-10-20"]);
    // createdAt <= old start moves to the new (earlier) start too, so day 1 still has them; later ones stay.
    expect(updateSettings(s, { startDate: "not-a-day" })).toBe(s);
  });
  it("clamps the numeric settings", () => {
    const s = fixtureState();
    const next = updateSettings(s, { lengthDays: 0, streakThreshold: 150, sleepTargetHours: -2 });
    expect(next.settings).toMatchObject({ lengthDays: 1, streakThreshold: 100, sleepTargetHours: 0.5 });
    expect(updateSettings(s, {})).toBe(s);
  });
});

describe("habits in settings", () => {
  it("edits name, detail and category", () => {
    const s = editHabit(fixtureState(), A, { name: " Alpha+ ", detail: "", category: "custom" });
    expect(s.habits[0]).toMatchObject({ id: A, name: "Alpha+", category: "custom" });
    expect(s.habits[0]!.detail).toBeUndefined();
    expect(editHabit(s, A, { name: "  " }).habits[0]!.name).toBe("Alpha+"); // empty name ignored
  });
  it("moves a habit up or down among active habits (archived ones are skipped)", () => {
    const active = (st: ReturnType<typeof fixtureState>) =>
      st.habits.filter((h) => h.archivedAt === undefined).sort((a, b) => a.order - b.order).map((h) => h.id);
    expect(active(fixtureState())).toEqual([A, C, D, Z]);
    const s = moveHabit(fixtureState(), C, -1); // B is archived, so C steps over it to swap with A
    expect(active(s)).toEqual([C, A, D, Z]);
    expect(active(moveHabit(s, D, 1))).toEqual([C, A, Z, D]);
    expect(moveHabit(s, C, -1)).toBe(s); // already first
    expect(moveHabit(s, Z, 1)).toBe(s); // already last
  });
});

describe("deleteHabit", () => {
  it("archives a habit that was scheduled on past days, leaving every past day's percentage unchanged", () => {
    const s = fixtureState();
    const today = "2026-10-13"; // D was created 10-08, five days earlier, and is never checked here
    s.logs = Object.fromEntries(
      Object.entries(s.logs).map(([k, l]) => [k, { ...l, completedHabitIds: l.completedHabitIds.filter((id) => id !== D) }]),
    );
    const before = arcDaysSoFar(s.settings, today).map((d) => dailyCompletion(s, d).percent);
    const next = deleteHabit(s, today, D);
    const d = next.habits.find((h) => h.id === D)!;
    expect(d.archivedAt).toBe(today);
    const after = arcDaysSoFar(next.settings, today).map((d2) => dailyCompletion(next, d2).percent);
    // past days identical; only today (last entry) may change
    expect(after.slice(0, -1)).toEqual(before.slice(0, -1));
    expect(scheduledHabits(next.habits, today).map((h) => h.id)).toEqual([A, C]);
  });
  it("today's check-off of an archived habit stops counting", () => {
    const s = fixtureState(); // today 10-14: log has [A], scheduled A C D -> 1/3
    s.logs[T] = { date: T, completedHabitIds: [A, D] };
    const next = deleteHabit(s, T, D);
    expect(dailyCompletion(next, T)).toMatchObject({ scheduled: 2, completed: 1 });
  });
  it("hard-deletes a habit created today or later and strips it from logs", () => {
    const s = fixtureState();
    s.logs[T] = { date: T, completedHabitIds: [A, Z] };
    const z = deleteHabit(s, T, Z); // created 10-20, after today
    expect(z.habits.some((h) => h.id === Z)).toBe(false);
    expect(z.logs[T]!.completedHabitIds).toEqual([A]);
    s.habits.push({ id: "new", name: "New", category: "custom", order: 9, createdAt: T });
    const n = deleteHabit(s, T, "new");
    expect(n.habits.some((h) => h.id === "new")).toBe(false);
  });
  it("archives a habit created yesterday (it had one scheduled day) rather than deleting it", () => {
    const s = fixtureState();
    s.habits.push({ id: "y", name: "Yesterday", category: "custom", order: 9, createdAt: "2026-10-13" });
    const next = deleteHabit(s, T, "y");
    expect(next.habits.find((h) => h.id === "y")?.archivedAt).toBe(T);
  });
  it("returns the same state for an unknown id", () => {
    const s = fixtureState();
    expect(deleteHabit(s, T, "nope")).toBe(s);
    expect(editHabit(s, "nope", { name: "x" })).toBe(s);
    expect(moveHabit(s, "nope", 1)).toBe(s);
    expect(incGoal(s, "nope", 1)).toBe(s);
    expect(removeGoal(s, "nope")).toBe(s);
  });
  it("hard-deleting a never-scheduled habit changes no day's percentage", () => {
    const s = fixtureState();
    const before = arcDaysSoFar(s.settings, T).map((d) => dailyCompletion(s, d).percent);
    const next = deleteHabit(s, T, Z);
    expect(arcDaysSoFar(next.settings, T).map((d) => dailyCompletion(next, d).percent)).toEqual(before);
  });
});

describe("resetArc", () => {
  it("clears logs, starts today, keeps goals and active habits, drops archived ones", () => {
    let s = addGoal(fixtureState(), T, { name: "Books", target: 5 });
    s.ui.lastCelebratedLevel = 3;
    const next = resetArc(s, T);
    expect(next.logs).toEqual({});
    expect(next.settings.startDate).toBe(T);
    expect(next.settings.lengthDays).toBe(14);
    expect(next.goals).toHaveLength(1);
    expect(next.habits.map((h) => h.id)).toEqual([A, C, D, Z]); // B was archived
    expect(next.habits.every((h) => h.archivedAt === undefined)).toBe(true);
    expect(next.habits.find((h) => h.id === A)!.createdAt).toBe(T); // moved with the start date
    expect(next.habits.find((h) => h.id === D)!.createdAt).toBe("2026-10-08");
    expect(next.ui.lastCelebratedLevel).toBe(1);
  });
});
