import { describe, expect, it } from "vitest";
import { A, ARC, B, C, D, FIX_NOW, FIX_TODAY, Z, fixtureState } from "./fixtures/arc14";
import { logKey } from "../types";
import * as m from "./mutations";
import { defaultState, serialize, validateState } from "./storage";

/** Every mutation result must survive a save and reload. */
function roundTrips(s: ReturnType<typeof fixtureState>): void {
  const r = validateState(JSON.parse(serialize(s)));
  if (!r.ok) throw new Error(r.error);
}

const NOW = "2026-10-14T20:00:00.000Z";
const key = logKey(ARC, FIX_TODAY);

describe("check-offs", () => {
  it("toggle adds and removes, stamping updatedAt and queueing one op per row", () => {
    const s0 = fixtureState();
    const s1 = m.toggleHabit(s0, NOW, ARC, FIX_TODAY, C);
    expect(s1.logs[key]!.completedHabitIds).toEqual([A, C]);
    expect(s1.logs[key]!.updatedAt).toBe(NOW);
    expect(s1.sync.queue).toEqual([{ table: "day_logs", id: s1.logs[key]!.id, at: NOW }]);
    const s2 = m.toggleHabit(s1, "2026-10-14T21:00:00.000Z", ARC, FIX_TODAY, C);
    expect(s2.logs[key]!.completedHabitIds).toEqual([A]);
    expect(s2.sync.queue).toHaveLength(1); // coalesced
    expect(s2.sync.queue[0]!.at).toBe("2026-10-14T21:00:00.000Z");
  });
  it("creates a log with a uuid for a new day", () => {
    const s = m.toggleHabit(fixtureState(), NOW, ARC, "2026-10-15", A);
    const l = s.logs[logKey(ARC, "2026-10-15")]!;
    expect(l.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(l).toMatchObject({ arcId: ARC, date: "2026-10-15", completedHabitIds: [A] });
  });
  it("setCheckoff is idempotent", () => {
    const s = fixtureState();
    expect(m.setCheckoff(s, NOW, ARC, FIX_TODAY, A, true)).toBe(s);
    expect(m.setCheckoff(s, NOW, ARC, FIX_TODAY, A, false).logs[key]!.completedHabitIds).toEqual([]);
  });
  it("mood set and clear", () => {
    const s = fixtureState();
    const s1 = m.setMood(s, NOW, ARC, FIX_TODAY, "rough");
    expect(s1.logs[key]!.mood).toBe("rough");
    expect(m.setMood(s1, NOW, ARC, FIX_TODAY, "rough")).toBe(s1);
    expect(m.setMood(s1, NOW, ARC, FIX_TODAY, undefined).logs[key]!.mood).toBeUndefined();
  });
});

describe("habits", () => {
  it("add trims, orders after the last and queues", () => {
    const s = m.addHabit(fixtureState(), NOW, FIX_TODAY, ARC, { name: "  Walk ", detail: " " });
    const h = s.habits.at(-1)!;
    expect(h).toMatchObject({ arcId: ARC, name: "Walk", order: 6, createdAt: FIX_TODAY, updatedAt: NOW });
    expect(h.detail).toBeUndefined();
    expect(s.sync.queue).toEqual([{ table: "habits", id: h.id, at: NOW }]);
    const same = fixtureState();
    expect(m.addHabit(same, NOW, FIX_TODAY, ARC, { name: "   " })).toBe(same);
  });
  it("edit name and detail", () => {
    const s = m.editHabit(fixtureState(), NOW, C, { name: "Charlie!", detail: undefined });
    const c = s.habits.find((h) => h.id === C)!;
    expect(c.name).toBe("Charlie!");
    expect(c.detail).toBeUndefined();
    expect(c.updatedAt).toBe(NOW);
  });
  it("reorder by id list", () => {
    const s = m.reorderHabits(fixtureState(), NOW, ARC, [D, A, C]);
    const order = (id: string) => s.habits.find((h) => h.id === id)!.order;
    expect([order(D), order(A), order(C)]).toEqual([0, 1, 2]);
    expect(order(Z)).toBe(3); // unlisted active habits follow in their old order
    expect(order(B)).toBe(1); // archived untouched
  });
  it("remove archives a habit with history and keeps past days", () => {
    const s0 = fixtureState();
    const s = m.removeHabit(s0, NOW, FIX_TODAY, C);
    const c = s.habits.find((h) => h.id === C)!;
    expect(c.archivedAt).toBe(FIX_TODAY);
    expect(c.deleted).toBeUndefined();
    expect(s.logs[logKey(ARC, "2026-10-13")]!.completedHabitIds).toContain(C);
    expect(m.isHardDeletable(s0, c, FIX_TODAY)).toBe(false);
  });
  it("remove hard deletes a habit created today with no check-offs (as a tombstone)", () => {
    const s0 = m.addHabit(fixtureState(), NOW, FIX_TODAY, ARC, { name: "New" });
    const id = s0.habits.at(-1)!.id;
    expect(m.isHardDeletable(s0, s0.habits.at(-1)!, FIX_TODAY)).toBe(true);
    const s = m.removeHabit(s0, NOW, FIX_TODAY, id);
    expect(s.habits.find((h) => h.id === id)!.deleted).toBe(true);
    // a habit created today but already checked is archived instead
    const s2 = m.toggleHabit(s0, NOW, ARC, FIX_TODAY, id);
    expect(m.isHardDeletable(s2, s2.habits.at(-1)!, FIX_TODAY)).toBe(false);
    expect(m.removeHabit(s2, NOW, FIX_TODAY, id).habits.at(-1)!.archivedAt).toBe(FIX_TODAY);
  });
  it("restore undoes either kind of removal", () => {
    const s0 = m.addHabit(fixtureState(), NOW, FIX_TODAY, ARC, { name: "New" });
    const id = s0.habits.at(-1)!.id;
    const hard = m.restoreHabit(m.removeHabit(s0, NOW, FIX_TODAY, id), NOW, id);
    expect(hard.habits.find((h) => h.id === id)!.deleted).toBeUndefined();
    const soft = m.restoreHabit(m.removeHabit(s0, NOW, FIX_TODAY, C), NOW, C);
    expect(soft.habits.find((h) => h.id === C)!.archivedAt).toBeUndefined();
  });
});

describe("arcs", () => {
  it("create with habits, becomes active", () => {
    const s = m.createArc(defaultState(NOW), NOW, {
      name: "Spring Arc", season: "spring", look: "greenhouse", startDate: "2026-11-01", lengthDays: 30,
      habits: [{ name: "Read", detail: "10 pages" }, { name: "Walk" }],
    });
    const arc = s.arcs[0]!;
    expect(arc).toMatchObject({ name: "Spring Arc", season: "spring", look: "greenhouse", startDate: "2026-11-01", lengthDays: 30, threshold: 80, createdAt: NOW });
    expect(s.activeArcId).toBe(arc.id);
    expect(s.habits.map((h) => [h.arcId, h.name, h.order, h.createdAt])).toEqual([[arc.id, "Read", 0, "2026-11-01"], [arc.id, "Walk", 1, "2026-11-01"]]);
    expect(s.sync.queue.map((o) => o.table)).toEqual(["arcs", "habits", "habits"]);
  });
  it("create clamps length and threshold and defaults the name", () => {
    const s = m.createArc(defaultState(NOW), NOW, { name: " ", season: "summer", look: "journal", startDate: "2026-11-01", lengthDays: 0, threshold: 500 });
    expect(s.arcs[0]).toMatchObject({ name: "Summer Arc", lengthDays: 1, threshold: 100 });
  });
  it("update patches and moves day-1 habits with the start", () => {
    const s = m.updateArc(fixtureState(), NOW, ARC, { startDate: "2026-10-03", name: "Deep Winter", threshold: 90 });
    expect(s.arcs[0]).toMatchObject({ startDate: "2026-10-03", name: "Deep Winter", threshold: 90, updatedAt: NOW });
    expect(s.habits.find((h) => h.id === A)!.createdAt).toBe("2026-10-03");
    expect(s.habits.find((h) => h.id === D)!.createdAt).toBe("2026-10-08");
    const same = fixtureState();
    expect(m.updateArc(same, NOW, ARC, {})).toBe(same);
  });
  it("moving the start never puts an archived habit's start after its archive day", () => {
    const later = m.updateArc(fixtureState(), NOW, ARC, { startDate: "2026-10-12" });
    const b = later.habits.find((h) => h.id === B)!;
    expect(b.createdAt <= b.archivedAt!).toBe(true);
    expect(later.habits.find((h) => h.id === A)!.createdAt).toBe("2026-10-12");
    roundTrips(later);
  });
  it("removing a habit whose start is in the future stays valid", () => {
    const future = m.updateArc(fixtureState(), NOW, ARC, { startDate: "2026-10-20" });
    const s = m.removeHabit(m.toggleHabit(future, NOW, ARC, "2026-10-20", A), NOW, FIX_TODAY, A);
    roundTrips(s);
    const a = s.habits.find((h) => h.id === A)!;
    expect(a.archivedAt! >= a.createdAt).toBe(true);
  });
  it("set active, freeze, delete", () => {
    const s0 = fixtureState();
    expect(m.setActiveArc(s0, "ghost")).toBe(s0);
    expect(m.freezeArc(s0, NOW, ARC).arcs[0]!.frozenAt).toBe(NOW);
    const d = m.deleteArc(s0, NOW, ARC);
    expect(d.arcs[0]!.deleted).toBe(true);
    expect(d.activeArcId).toBeNull();
    expect(d.habits.every((h) => h.deleted)).toBe(true);
  });
  it("reset wipes the arc's logs, visitors and celebrations and restarts today", () => {
    let s = fixtureState();
    s = m.addVisitor(s, NOW, ARC, "winter-robin", "2026-10-09");
    s = m.markCelebrated(s, `bloom:${ARC}:2026-10-09`);
    s = m.markCelebrated(s, "bloom:other:2026-10-09");
    s = m.freezeArc(s, NOW, ARC);
    const before = Object.values(s.logs).map((l) => l.id).sort();
    const r = m.resetArc(s, NOW, FIX_TODAY, ARC);
    expect(r.arcs[0]!.startDate).toBe(FIX_TODAY);
    expect(r.arcs[0]!.frozenAt).toBeUndefined();
    // Logs are emptied, not removed, and queued so the reset reaches other devices.
    expect(Object.values(r.logs).map((l) => l.id).sort()).toEqual(before);
    expect(Object.values(r.logs).every((l) => l.completedHabitIds.length === 0 && l.mood === undefined)).toBe(true);
    const queued = new Set(r.sync.queue.filter((o) => o.table === "day_logs").map((o) => o.id));
    for (const id of before) expect(queued.has(id)).toBe(true);
    // Found visitors are never lost (SPEC 7.3), so they and their celebration stay.
    expect(r.visitors).toHaveLength(1);
    expect(r.ui.celebrated).toEqual({ "bloom:other:2026-10-09": true });
    roundTrips(r);
    expect(r.habits.find((h) => h.id === B)!.deleted).toBe(true); // archived habits go
    expect(r.habits.find((h) => h.id === A)!.createdAt).toBe(FIX_TODAY);
    expect(r.habits.find((h) => h.id === Z)!.createdAt).toBe(FIX_TODAY);
  });
});

describe("settings, visitors, ui", () => {
  it("settings patch", () => {
    const s = m.updateSettings(fixtureState(), NOW, { motion: false });
    expect(s.settings.motion).toBe(false);
    expect(s.settings.updatedAt).toBe(NOW);
    expect(s.sync.queue).toEqual([{ table: "settings", id: "settings", at: NOW }]);
    expect(m.updateSettings(s, NOW, { motion: false })).toBe(s);
  });
  it("visitor found once per arc", () => {
    const s = m.addVisitor(fixtureState(), NOW, ARC, "winter-robin", "2026-10-09");
    expect(s.visitors[0]).toMatchObject({ arcId: ARC, visitorId: "winter-robin", foundOn: "2026-10-09", updatedAt: NOW });
    expect(m.addVisitor(s, NOW, ARC, "winter-robin", "2026-10-10")).toBe(s);
  });
  it("ui flags", () => {
    const s = m.markRecapSeen(fixtureState(), `${ARC}:2026-10-05`);
    expect(s.ui.recapSeen).toEqual([`${ARC}:2026-10-05`]);
    expect(m.markRecapSeen(s, `${ARC}:2026-10-05`)).toBe(s);
    expect(m.setUiFlag(s, "signInPrompted", true).ui.signInPrompted).toBe(true);
  });
  it("FIX_NOW is a timestamp", () => {
    expect(FIX_NOW).toMatch(/T/);
  });
});
