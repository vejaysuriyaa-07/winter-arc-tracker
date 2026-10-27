import { describe, expect, it } from "vitest";
import type { AppState } from "../types";
import { logKey } from "../types";
import { createArc, syncVisitors } from "./mutations";
import { defaultState } from "./storage";
import { addDays, eachDay } from "./dates";
import { skyEvents } from "./sky";
import { latestRecap, recapModel, recapWeeks } from "./recap";

const T = "2026-01-01T00:00:00.000Z";
const NOW = "2026-02-01T12:00:00.000Z";

function arcWith(pattern: (i: number) => ("a" | "b")[], opts: { season?: "winter" | "spring" | "summer" | "autumn"; length?: number; moods?: Record<number, "low" | "rough"> } = {}): AppState {
  let s = createArc(defaultState(T), T, { name: "W", season: opts.season ?? "winter", look: "journal", startDate: "2026-01-05", lengthDays: opts.length ?? 90, habits: [{ name: "a" }, { name: "b" }] });
  const arc = s.arcs[0]!;
  const [a, b] = s.habits.map((h) => h.id);
  const ids = { a: a!, b: b! };
  const logs = { ...s.logs };
  for (const [i, date] of eachDay(arc.startDate, addDays(arc.startDate, (opts.length ?? 90) - 1)).entries()) {
    const done = pattern(i).map((k) => ids[k]);
    const mood = opts.moods?.[i];
    if (done.length || mood) logs[logKey(arc.id, date)] = { id: `l${i}`, arcId: arc.id, date, completedHabitIds: done, updatedAt: T, ...(mood ? { mood } : {}) };
  }
  s = { ...s, logs };
  return s;
}
const day = (i: number) => addDays("2026-01-05", i);
const at = (ymd: string, h: number, m = 0) => new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)), h, m);

describe("syncVisitors", () => {
  it("silent: adds every earned visitor with the day it was earned and marks it celebrated", () => {
    const s = arcWith((i) => (i < 5 ? ["a", "b"] : []));
    const r = syncVisitors(s, NOW, day(10), true);
    const robin = r.state.visitors.find((x) => x.visitorId === "winter-robin")!;
    expect(robin.foundOn).toBe(day(2));
    expect(r.state.ui.celebrated[`visitor:${robin.id}`]).toBe(true);
    expect(r.arrived).toEqual([]);
  });
  it("live: arrivals are returned and left for their entrance; found visitors are never added twice", () => {
    const s = arcWith((i) => (i < 3 ? ["a", "b"] : []));
    const r = syncVisitors(s, NOW, day(2), false);
    expect(r.arrived.map((x) => x.visitorId).filter((id) => id !== "winter-shooting-star")).toEqual(["winter-robin"]);
    expect(r.state.ui.celebrated[`visitor:${r.arrived[0]!.id}`]).toBeUndefined();
    const again = syncVisitors(r.state, NOW, day(2), false);
    expect(again.state).toBe(r.state);
    expect(again.arrived).toEqual([]);
  });
  it("arcs that have not started find nothing", () => {
    const s = arcWith(() => ["a", "b"]);
    expect(syncVisitors(s, NOW, "2026-01-01", false).arrived).toEqual([]);
  });
});

describe("rare skies (SPEC 7.4)", () => {
  it("night from 19:00 to 05:59", () => {
    const s = arcWith(() => []);
    const arc = s.arcs[0]!;
    expect(skyEvents(s, arc, day(3), at(day(3), 18, 59)).night).toBe(false);
    expect(skyEvents(s, arc, day(3), at(day(3), 19, 0)).night).toBe(true);
    expect(skyEvents(s, arc, day(3), at(day(3), 5, 59)).night).toBe(true);
    expect(skyEvents(s, arc, day(3), at(day(3), 6, 0)).night).toBe(false);
  });
  it("a full day's night: fireflies in spring and summer, brighter stars in autumn and winter", () => {
    for (const season of ["spring", "summer"] as const) {
      const s = arcWith(() => ["a", "b"], { season });
      expect(skyEvents(s, s.arcs[0]!, day(3), at(day(3), 21))).toMatchObject({ night: true, fireflies: true, brightStars: false });
    }
    for (const season of ["autumn", "winter"] as const) {
      const s = arcWith(() => ["a", "b"], { season });
      expect(skyEvents(s, s.arcs[0]!, day(3), at(day(3), 21))).toMatchObject({ night: true, fireflies: false, brightStars: true });
    }
    const notFull = arcWith(() => ["a"], { season: "summer" });
    expect(skyEvents(notFull, notFull.arcs[0]!, day(3), at(day(3), 21))).toMatchObject({ fireflies: false, brightStars: false });
  });
  it("northern lights: winter, at night, within 7 days of finishing a perfect week", () => {
    const s = arcWith((i) => (i < 7 ? ["a", "b"] : [])); // Jan 5-11 perfect, Sunday Jan 11
    const arc = s.arcs[0]!;
    expect(skyEvents(s, arc, day(6), at(day(6), 21)).aurora).toBe(true); // the Sunday it finished
    expect(skyEvents(s, arc, day(13), at(day(13), 21)).aurora).toBe(true); // 7 days later
    expect(skyEvents(s, arc, day(14), at(day(14), 21)).aurora).toBe(false); // 8 days later
    expect(skyEvents(s, arc, day(8), at(day(8), 14)).aurora).toBe(false); // daytime
    const spring = arcWith((i) => (i < 7 ? ["a", "b"] : []), { season: "spring" });
    expect(skyEvents(spring, spring.arcs[0]!, day(8), at(day(8), 21)).aurora).toBe(false);
  });
  it("rainbow: low or rough mood and a full day, in daylight", () => {
    const s = arcWith((i) => (i === 3 ? ["a", "b"] : i === 4 ? ["a"] : []), { moods: { 3: "low", 4: "rough" } });
    const arc = s.arcs[0]!;
    expect(skyEvents(s, arc, day(3), at(day(3), 14)).rainbow).toBe(true);
    expect(skyEvents(s, arc, day(4), at(day(4), 14)).rainbow).toBe(false); // not full
    expect(skyEvents(s, arc, day(3), at(day(3), 21)).rainbow).toBe(false); // night wins
    const good = arcWith(() => ["a", "b"]);
    expect(skyEvents(good, good.arcs[0]!, day(3), at(day(3), 14)).rainbow).toBe(false);
  });
});

describe("Sunday recap (SPEC 5.9, 7.5)", () => {
  it("each finished Monday-to-Sunday week, from Sunday 18:00", () => {
    const s = arcWith(() => ["a"]);
    const arc = s.arcs[0]!;
    expect(recapWeeks(s, arc, at(day(6), 17, 59))).toEqual([]);
    expect(recapWeeks(s, arc, at(day(6), 18, 0))).toEqual(["2026-01-05"]);
    expect(recapWeeks(s, arc, at(day(15), 9))).toEqual(["2026-01-05", "2026-01-12"]);
    expect(latestRecap(s, arc, at(day(15), 9))).toBe("2026-01-12");
    expect(latestRecap({ ...s, ui: { ...s.ui, recapSeen: [`${arc.id}:2026-01-12`] } }, arc, at(day(15), 9))).toBeNull();
  });
  it("the model: score vs the week before, growth, visitors, highlights", () => {
    // Week 1: a every day, b on 2 days. Week 2: both every day.
    const s0 = arcWith((i) => (i < 7 ? (i < 2 ? ["a", "b"] : ["a"]) : i < 14 ? ["a", "b"] : []));
    const s = syncVisitors(s0, NOW, day(13), true).state;
    const arc = s.arcs[0]!;
    const m = recapModel(s, arc, "2026-01-12", day(15));
    expect(m.weekNumber).toBe(2);
    expect(m.score).toBe(100);
    expect(m.previousScore).toBeCloseTo((7 + 2) / 14 * 100);
    expect(m.fullBlooms).toBe(7);
    expect(m.missedDays).toBe(0);
    expect(m.bestWeek).toBe(true);
    expect(m.newFlowers).toBe(7);
    expect(m.visitors.map((x) => x.visitorId)).toContain("winter-red-fox");
    expect(m.highlights.neverMissed).toEqual({ name: "a", done: 7, of: 7 });
    expect(m.highlights.mostImproved).toEqual({ name: "b", from: 2, to: 7 });
    expect(m.highlights.needsLove).not.toBeNull();
    expect(m.highlights.comingUp).not.toBeNull();
  });
});

describe("review fixes", () => {
  it("visitors are counted by their own season, so a season change never miscounts", async () => {
    const { foundInSeason } = await import("./visitors");
    const s = syncVisitors(arcWith((i) => (i < 20 ? ["a", "b"] : [])), NOW, day(25), true).state;
    const arc = s.arcs[0]!;
    const winter = foundInSeason(s, "winter").length;
    expect(winter).toBeGreaterThan(3);
    const spring = { ...s, arcs: [{ ...arc, season: "spring" as const }] };
    expect(foundInSeason(spring, "winter").length).toBe(winter); // never lost
    expect(foundInSeason(spring, "spring")).toEqual([]);
    const after = syncVisitors(spring, NOW, day(25), true);
    expect(after.arrived).toEqual([]); // the switch is a quiet sync
    expect(foundInSeason(after.state, "spring").length).toBeGreaterThan(0);
    expect(foundInSeason(after.state, "spring").length).toBeLessThanOrEqual(9);
  });
  it("a backfill that unchecks days never removes a found visitor", () => {
    const s = syncVisitors(arcWith((i) => (i < 5 ? ["a", "b"] : [])), NOW, day(10), true).state;
    const before = s.visitors.length;
    const wiped = { ...s, logs: {} };
    expect(syncVisitors(wiped, NOW, day(10), false).state.visitors).toHaveLength(before);
  });
  it("live sync skips finished arcs", () => {
    const s = arcWith((i) => (i < 30 ? ["a", "b"] : []), { length: 30 });
    expect(syncVisitors(s, NOW, day(40), false).arrived).toEqual([]);
  });
  it("week numbers count from the Monday of the arc's first week", () => {
    let s = createArc(defaultState(T), T, { name: "W", season: "winter", look: "journal", startDate: "2026-01-07", lengthDays: 30, habits: [{ name: "a" }] });
    const arc = s.arcs[0]!;
    expect(recapModel(s, arc, "2026-01-05", "2026-02-20").weekNumber).toBe(1);
    expect(recapModel(s, arc, "2026-01-12", "2026-02-20").weekNumber).toBe(2);
    // The arc ends Fri Feb 5; its last partial week is ready on Sunday Feb 8 at 18:00.
    expect(recapWeeks(s, arc, new Date(2026, 1, 8, 18, 0)).at(-1)).toBe("2026-02-02");
    expect(recapWeeks(s, arc, new Date(2026, 1, 8, 17, 0)).at(-1)).toBe("2026-01-26");
    void s;
  });
  it("pending entrances queue oldest first, the rare one included", async () => {
    const { pendingEntrance } = await import("./visitors");
    const s = arcWith(() => ["a", "b"]);
    const arc = s.arcs[0]!;
    const withTwo: AppState = { ...s, visitors: [
      { id: "r", arcId: arc.id, visitorId: "winter-shooting-star", foundOn: day(3), updatedAt: T },
      { id: "c", arcId: arc.id, visitorId: "winter-cardinal", foundOn: day(4), updatedAt: T },
    ] };
    expect(pendingEntrance(withTwo, arc)?.id).toBe("r");
    expect(pendingEntrance({ ...withTwo, ui: { ...withTwo.ui, celebrated: { "visitor:r": true } } }, arc)?.id).toBe("c");
  });
});

describe("share errors", () => {
  it("only a user cancel is a cancel; anything else falls back to a download", async () => {
    const { shareOutcome } = await import("./share");
    expect(shareOutcome(new DOMException("x", "AbortError"))).toBe("cancelled");
    expect(shareOutcome(new DOMException("x", "NotAllowedError"))).toBe("fallback");
    expect(shareOutcome(new Error("x"))).toBe("fallback");
  });
});
