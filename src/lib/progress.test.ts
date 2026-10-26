import { describe, expect, it } from "vitest";
import { A, ARC, B, C, D, FIX_TODAY, Z, fixtureState } from "./fixtures/arc14";
import * as p from "./progress";
import { gardenFromState, NO_EVENTS } from "./garden";
import { createArc } from "./mutations";

const S = fixtureState();
const arc = S.arcs[0]!;

describe("this arc", () => {
  it("tiles", () => {
    expect(p.arcTiles(S, arc, FIX_TODAY)).toEqual({ kept: 6, daysSoFar: 10, score: 24 / 31 * 100, chain: 2, bestChain: 3 });
  });
  it("plants, tallest first (days done, then name); tombstones dropped", () => {
    const rows = p.plantsRanked(S, arc, FIX_TODAY);
    expect(rows.map((r) => [r.habit.id, r.daysDone, r.daysScheduled])).toEqual([
      [A, 9, 10], [C, 8, 10], [D, 4, 7], [B, 3, 4], [Z, 0, 0],
    ]);
    expect(rows[0]!.g).toBeCloseTo(9 / 11);
    expect(rows.find((r) => r.habit.id === B)!.archived).toBe(true);
  });
  it("week line names the weakest weekday", () => {
    expect(p.weekLine(S, arc, FIX_TODAY)).toBe("Saturdays are your dry spot");
    const empty = fixtureState();
    empty.logs = {};
    // every weekday at 0: the first (Monday) is the weakest by the tie rule
    expect(p.weekLine(empty, arc, FIX_TODAY)).toBe("Mondays are your dry spot");
    expect(p.weekLine(S, arc, "2026-10-01")).toBeNull();
  });
  it("timelapse days: 1 to today, capped at the arc's length", () => {
    expect(p.timelapseRange(arc, FIX_TODAY)).toEqual({ first: 1, last: 10 });
    expect(p.timelapseRange(arc, "2026-12-01")).toEqual({ first: 1, last: 14 });
    expect(p.timelapseDay(arc, 3)).toBe("2026-10-07");
  });
  it("the timelapse frame for today is the live garden", () => {
    expect(gardenFromState(S, arc, p.timelapseDay(arc, 10), NO_EVENTS)).toEqual(gardenFromState(S, arc, FIX_TODAY, NO_EVENTS));
  });
});

describe("plant detail", () => {
  it("one cell per arc day so far", () => {
    const days = p.plantDays(S, S.habits.find((h) => h.id === D)!, FIX_TODAY);
    expect(days).toHaveLength(10);
    expect(days.slice(0, 4).map((d) => d.status)).toEqual(["none", "none", "none", "done"]); // D starts day 4
    expect(days.map((d) => d.status)).toEqual(["none", "none", "none", "done", "done", "missed", "missed", "done", "done", "today"]);
  });
  it("the same habit across arcs, matched by name", () => {
    let s = createArc(fixtureState(), "2026-10-20T00:00:00.000Z", { name: "Next", season: "spring", look: "journal", startDate: "2026-10-20", lengthDays: 10, habits: [{ name: " alpha " }, { name: "Other" }] });
    const next = s.arcs[1]!;
    const newA = s.habits.find((h) => h.arcId === next.id && h.name === "alpha")!;
    s = { ...s, logs: { ...s.logs, [`${next.id}:2026-10-20`]: { id: "x", arcId: next.id, date: "2026-10-20", completedHabitIds: [newA.id], updatedAt: "" } } };
    const across = p.habitAcrossArcs(s, "Alpha", "2026-10-21");
    expect(across.map((r) => [r.arc.name, r.daysDone, r.daysScheduled])).toEqual([["Winter Arc", 9, 14], ["Next", 1, 2]]);
  });
});

describe("all time", () => {
  it("rings: thickness 2 + rate*7 from radius 9, gaps grey, fit inside the box", () => {
    const rings = p.treeRings(S, FIX_TODAY, 134);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toMatchObject({ year: 2026, month: 10, inner: 9, rate: 0.6, arcId: ARC });
    expect(rings[0]!.outer).toBeCloseTo(9 + 2 + 0.6 * 7);
    const many = fixtureState();
    many.arcs.push({ ...many.arcs[0]!, id: "late", startDate: "2028-01-01", lengthDays: 30 });
    const r2 = p.treeRings(many, "2028-01-20", 134);
    expect(r2.length).toBe(16); // Oct 2026 .. Jan 2028
    expect(r2.filter((r) => r.arcId === null).length).toBe(14); // Nov 2026 .. Dec 2027
    expect(r2[1]!.rate).toBeNull();
    expect(r2.at(-1)!.outer).toBeLessThanOrEqual(134);
  });
  it("best month line", () => {
    expect(p.bestMonthLine(S, FIX_TODAY)).toBe("Your best month was October, at 60%.");
  });
  it("tallest trees across arcs by name", () => {
    const t = p.tallestTrees(S, FIX_TODAY, 3);
    expect(t.map((x) => [x.name, x.daysDone])).toEqual([["Alpha", 9], ["Charlie", 8], ["Delta", 4]]);
  });
});
