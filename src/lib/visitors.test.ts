import { describe, expect, it } from "vitest";
import type { AppState } from "../types";
import { logKey } from "../types";
import { createArc } from "./mutations";
import { defaultState } from "./storage";
import { addDays, eachDay } from "./dates";
import * as v from "./visitors";

const T = "2026-01-01T00:00:00.000Z";

/** A 90-day winter arc from Mon 2026-01-05 with habits a, b; `pattern(dayIndex)` gives the ids done. */
function arcWith(pattern: (i: number) => ("a" | "b")[], lengthDays = 90, season: "winter" | "spring" = "winter"): AppState {
  let s = createArc(defaultState(T), T, { name: "W", season, look: "journal", startDate: "2026-01-05", lengthDays, habits: [{ name: "a" }, { name: "b" }] });
  const arc = s.arcs[0]!;
  const [a, b] = s.habits.map((h) => h.id);
  const ids = { a: a!, b: b! };
  const logs = { ...s.logs };
  for (const [i, date] of eachDay(arc.startDate, addDays(arc.startDate, lengthDays - 1)).entries()) {
    const done = pattern(i).map((k) => ids[k]);
    if (done.length) logs[logKey(arc.id, date)] = { id: `l${i}`, arcId: arc.id, date, completedHabitIds: done, updatedAt: T };
  }
  s = { ...s, logs };
  return s;
}
const day = (i: number) => addDays("2026-01-05", i);
// The rare visitor (rule 9) depends on a seeded roll of the random arc id; it has its own test.
const found = (s: AppState, today: string) => v.metVisitors(s, s.arcs[0]!, today).filter((x) => x.visitor.rule !== 9).map((x) => x.visitor.id);

describe("table", () => {
  it("nine per season with the spec's names in ladder order", () => {
    expect(v.VISITORS.winter.map((x) => x.name)).toEqual(["Robin", "Cardinal", "Rabbit", "Squirrel", "Red fox", "Deer", "Snowy owl", "Northern lights", "Shooting star"]);
    expect(v.VISITORS.spring.map((x) => x.name)).toEqual(["Bee", "Butterfly", "Songbird", "Hedgehog", "Fawn", "Swan", "Rabbit family", "Blossom rain", "Rainbow moth"]);
    expect(v.VISITORS.summer.map((x) => x.name)).toEqual(["Ladybug", "Dragonfly", "Frog", "Hummingbird", "Turtle", "Heron", "Fireflies", "Meteor shower", "Golden butterfly"]);
    expect(v.VISITORS.autumn.map((x) => x.name)).toEqual(["Squirrel", "Hedgehog", "Crow", "Owl", "Fox", "Elk", "Geese", "Harvest moon", "White deer"]);
  });
  it("scaling: counts x length/90, rounded, at least 3; weeks and rare unscaled", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((r) => v.target(r, 90))).toEqual([3, 5, 10, 15, 7, 1, 30, 2]);
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((r) => v.target(r, 30))).toEqual([3, 3, 3, 5, 3, 1, 10, 2]);
    expect(v.target(7, 200)).toBe(30); // never above the 90-day ladder
  });
});

describe("rules (90-day winter arc from Mon Jan 5)", () => {
  it("1: three kept days in a row", () => {
    const s = arcWith((i) => (i < 3 ? ["a", "b"] : []));
    expect(found(s, day(1))).toEqual([]);
    expect(found(s, day(2))).toEqual(["winter-robin"]);
  });
  it("every day full unlocks the ladder on the right days", () => {
    const s = arcWith(() => ["a", "b"]);
    expect(found(s, day(4))).toEqual(["winter-robin", "winter-cardinal"]); // 5 full days
    expect(found(s, day(6))).toContain("winter-red-fox"); // 7 full in a row
    expect(found(s, day(6))).toContain("winter-deer"); // Mon..Sun full: a perfect week
    expect(found(s, day(9))).toContain("winter-rabbit"); // 10 kept
    expect(found(s, day(14))).toContain("winter-squirrel");
    expect(found(s, day(13))).toContain("winter-northern-lights"); // 2 perfect weeks
    expect(found(s, day(29))).toContain("winter-snowy-owl"); // 30 full
    expect(found(s, day(28))).not.toContain("winter-snowy-owl");
  });
  it("a missed day breaks the runs but not the totals", () => {
    const s = arcWith((i) => (i === 2 ? [] : ["a", "b"]));
    expect(found(s, day(2))).toEqual([]);
    expect(found(s, day(5))).toEqual(["winter-robin", "winter-cardinal"]);
  });
  it("a perfect week must be a whole finished Mon-Sun week inside the arc", () => {
    const s = arcWith(() => ["a", "b"]);
    expect(found(s, day(5))).not.toContain("winter-deer"); // Saturday: not finished
  });
  it("rare: 1 in 50 on a full day, seeded by arc and date", () => {
    const s = arcWith(() => ["a", "b"]);
    const arc = s.arcs[0]!;
    const rolls = eachDay(arc.startDate, day(89)).filter((d) => v.rareRoll(arc.id, d));
    expect(rolls.length).toBeLessThan(10); // about 1.8 expected in 90 days
    for (const d of eachDay(arc.startDate, day(89))) expect(v.rareRoll(arc.id, d)).toBe(v.rareRoll(arc.id, d));
    // Over many arcs the rate is about 2%.
    let hits = 0;
    for (let k = 0; k < 400; k++) for (let i = 0; i < 50; i++) if (v.rareRoll(`arc-${k}`, addDays("2026-01-01", i))) hits++;
    expect(hits / 20000).toBeGreaterThan(0.015);
    expect(hits / 20000).toBeLessThan(0.025);
  });
  it("first day each rule was met", () => {
    const s = arcWith((i) => (i === 2 ? [] : ["a", "b"]));
    const met = v.metVisitors(s, s.arcs[0]!, day(20));
    expect(met.find((m) => m.visitor.id === "winter-robin")!.firstDay).toBe(day(5));
    expect(met.find((m) => m.visitor.id === "winter-cardinal")!.firstDay).toBe(day(5));
  });
  it("scaled for a 30-day arc", () => {
    const s = arcWith(() => ["a", "b"], 30, "spring");
    expect(found(s, day(2))).toEqual(["spring-bee", "spring-butterfly", "spring-songbird", "spring-fawn"]); // 3,3,3 and 3 full in a row
  });
});

describe("progress and the next visitor", () => {
  it("progress per rule and the closest locked visitor", () => {
    const s = arcWith((i) => (i < 4 ? ["a", "b"] : []));
    const p = v.visitorProgress(s, s.arcs[0]!, day(3));
    expect(p.find((x) => x.visitor.id === "winter-cardinal")).toMatchObject({ current: 4, target: 5, met: false });
    const next = v.nextVisitor(s, s.arcs[0]!, day(3), new Set(["winter-robin"]));
    expect(next!.visitor.id).toBe("winter-cardinal"); // 4/5 beats 4/7 and 4/10
    expect(v.teaser(next!)).toBe("1 more full day and a Cardinal visits");
  });
  it("rule copy", () => {
    expect(v.VISITORS.winter.map((x) => v.ruleText(x.rule, 90))).toEqual([
      "3 kept days in a row", "5 full days", "10 kept days", "15 kept days", "7 full days in a row", "A perfect week, Mon to Sun", "30 full days", "2 perfect weeks", "Rare, on any full day",
    ]);
  });
});

describe("garden visitor", () => {
  it("a new arrival shows on its day; later a found visitor visits on full days", () => {
    const s = arcWith((i) => (i === 5 ? ["a"] : ["a", "b"]));
    const arc = s.arcs[0]!;
    const withFound: AppState = { ...s, visitors: [{ id: "f1", arcId: arc.id, visitorId: "winter-robin", foundOn: day(2), updatedAt: T }] };
    expect(v.gardenVisitor(withFound, arc, day(2))).toBe("winter-robin");
    expect(v.gardenVisitor(withFound, arc, day(5))).toBeNull(); // not full
    expect(v.gardenVisitor(withFound, arc, day(6))).toBe("winter-robin");
    expect(v.gardenVisitor(withFound, arc, day(1))).toBeNull(); // before it was found
  });
});

describe("wording", () => {
  it("creatures move in; plurals and skies read naturally", () => {
    const by = (id: string) => v.ALL_VISITORS.find((x) => x.id === id)!;
    expect(v.arrivalLine(by("winter-robin"))).toBe("A Robin moved in");
    expect(v.arrivalLine(by("autumn-owl"))).toBe("An Owl moved in");
    expect(v.arrivalLine(by("autumn-geese"))).toBe("The geese moved in");
    expect(v.arrivalLine(by("summer-fireflies"))).toBe("Fireflies moved in");
    expect(v.arrivalLine(by("winter-northern-lights"))).toBe("The northern lights came out");
    expect(v.arrivalLine(by("autumn-harvest-moon"))).toBe("A harvest moon rose");
    expect(v.teaser({ visitor: by("autumn-geese"), current: 19, target: 30, fraction: 19 / 30, met: false })).toBe("11 more full days and the geese visit");
    expect(v.teaser({ visitor: by("winter-northern-lights"), current: 1, target: 2, fraction: 0.5, met: false })).toBe("1 more perfect week and the northern lights come out");
    expect(v.teaser({ visitor: by("winter-robin"), current: 2, target: 3, fraction: 2 / 3, met: false })).toBe("1 more kept day in a row and a Robin visits");
  });
});
