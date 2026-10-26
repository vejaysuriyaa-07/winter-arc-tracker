import { describe, expect, it } from "vitest";
import { A, ARC, B, C, D, FIX_TODAY, Z, fixtureState, zeroScheduledState } from "./fixtures/arc14";
import * as st from "./stats";

const S = fixtureState();
const arc = S.arcs[0]!;
const habit = (id: string) => S.habits.find((h) => h.id === id)!;
const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

describe("arc window", () => {
  it("end, day number, phase", () => {
    expect(st.arcEnd(arc)).toBe("2026-10-18");
    expect(st.arcDayNumber(arc, FIX_TODAY)).toBe(10);
    expect(st.arcPhase(arc, "2026-10-04")).toBe("before");
    expect(st.arcPhase(arc, FIX_TODAY)).toBe("active");
    expect(st.arcPhase(arc, "2026-10-19")).toBe("complete");
    expect(st.daysLeft(arc, FIX_TODAY)).toBe(4);
    expect(st.arcDaysSoFar(arc, FIX_TODAY)).toHaveLength(10);
    expect(st.arcDaysSoFar(arc, "2026-11-01")).toHaveLength(14);
    expect(st.arcDaysSoFar(arc, "2026-10-01")).toHaveLength(0);
  });
});

describe("scheduling", () => {
  it("ignores deleted habits and sorts by order", () => {
    expect(st.arcHabits(S, ARC).map((h) => h.id)).toEqual([A, B, C, D, Z]);
    expect(st.scheduledHabits(S, ARC, "2026-10-05").map((h) => h.id)).toEqual([A, B, C]);
    expect(st.scheduledHabits(S, ARC, "2026-10-08").map((h) => h.id)).toEqual([A, B, C, D]);
    expect(st.scheduledHabits(S, ARC, "2026-10-09").map((h) => h.id)).toEqual([A, C, D]);
  });
  it("daily completion", () => {
    expect(st.dailyCompletion(S, ARC, "2026-10-08")).toEqual({ scheduled: 4, completed: 4, percent: 100, logged: true });
    expect(st.dailyCompletion(S, ARC, "2026-10-10")).toEqual({ scheduled: 3, completed: 0, percent: 0, logged: false });
    expect(r1(st.dailyCompletion(S, ARC, "2026-10-13").percent)).toBe(100); // B's check-off ignored
    expect(st.dailyCompletion(S, ARC, "2026-10-13").completed).toBe(3);
  });
});

describe("days", () => {
  it("kept and full", () => {
    expect(st.isKept(S, arc, "2026-10-05")).toBe(true);
    expect(st.isKept(S, arc, "2026-10-06")).toBe(false);
    expect(st.isFull(S, arc, "2026-10-06")).toBe(false);
    expect(st.isFull(S, arc, "2026-10-08")).toBe(true);
    expect(st.isKept(zeroScheduledState(), arc, "2026-10-13")).toBeNull();
  });
  it("kept but not full needs a threshold below 100", () => {
    const s = fixtureState();
    s.arcs[0]!.threshold = 60;
    expect(st.isKept(s, s.arcs[0]!, "2026-10-06")).toBe(true); // 66.7 >= 60
    expect(st.isFull(s, s.arcs[0]!, "2026-10-06")).toBe(false);
  });
  it("counts", () => {
    expect(st.keptDays(S, arc, FIX_TODAY)).toBe(6);
    expect(st.fullDays(S, arc, FIX_TODAY)).toBe(6);
    expect(r1(st.arcScore(S, arc, FIX_TODAY).percent)).toBe(77.4);
    expect(st.arcScore(S, arc, FIX_TODAY)).toMatchObject({ completed: 24, scheduled: 31 });
    expect(r1(st.arcScore(zeroScheduledState(), arc, FIX_TODAY).percent)).toBe(77.3);
    expect(st.arcScore(S, arc, "2026-10-01").percent).toBeNull();
  });
});

describe("chain", () => {
  it("current and best", () => {
    expect(st.chain(S, arc, FIX_TODAY)).toBe(2);
    expect(st.bestChain(S, arc, FIX_TODAY)).toBe(3);
    expect(st.chain(zeroScheduledState(), arc, FIX_TODAY)).toBe(0);
    expect(st.bestChain(zeroScheduledState(), arc, FIX_TODAY)).toBe(3);
  });
  it("counts today once it is kept", () => {
    const s = fixtureState();
    s.logs[`${ARC}:2026-10-14`]!.completedHabitIds = [A, C, D];
    expect(st.chain(s, arc, FIX_TODAY)).toBe(3);
  });
  it("after the arc, ends at the arc's last day", () => {
    expect(st.chain(S, arc, "2026-11-01")).toBe(0); // d10..d14 unlogged
    expect(st.bestChain(S, arc, "2026-11-01")).toBe(3);
  });
  it("seven-day strip", () => {
    expect(st.chainStrip(S, arc, FIX_TODAY).map((d) => d.status)).toEqual([
      "full", "full", "missed", "missed", "full", "full", "pending",
    ]);
    expect(st.chainStrip(S, arc, FIX_TODAY)[0]!.date).toBe("2026-10-08");
    expect(st.chainStrip(S, arc, "2026-10-06").map((d) => d.status)).toEqual([
      "none", "none", "none", "none", "none", "full", "pending",
    ]);
  });
});

describe("per habit", () => {
  it("days done and rate", () => {
    expect(st.habitDaysDone(S, habit(A), FIX_TODAY)).toBe(9);
    expect(st.habitDaysDone(S, habit(B), FIX_TODAY)).toBe(3);
    expect(st.habitDaysDone(S, habit(Z), FIX_TODAY)).toBe(0);
    expect(r1(st.habitRate(S, habit(A), FIX_TODAY).percent)).toBe(90);
    expect(r1(st.habitRate(S, habit(B), FIX_TODAY).percent)).toBe(75);
    expect(r1(st.habitRate(S, habit(C), FIX_TODAY).percent)).toBe(80);
    expect(st.habitRate(S, habit(D), FIX_TODAY)).toMatchObject({ scheduledDays: 7, completedDays: 4 });
    expect(st.habitRate(S, habit(Z), FIX_TODAY).percent).toBeNull();
  });
  it("streaks", () => {
    expect(st.habitStreak(S, habit(A), FIX_TODAY)).toBe(4);
    expect(st.habitStreak(S, habit(B), FIX_TODAY)).toBe(2);
    expect(st.habitStreak(S, habit(C), FIX_TODAY)).toBe(3);
    expect(st.habitStreak(S, habit(D), FIX_TODAY)).toBe(2);
    expect(st.habitStreak(S, habit(Z), FIX_TODAY)).toBe(0);
    expect(st.habitBestStreak(S, habit(A), FIX_TODAY)).toBe(5);
    expect(st.habitBestStreak(S, habit(C), FIX_TODAY)).toBe(5);
    expect(st.habitBestStreak(S, habit(D), FIX_TODAY)).toBe(2);
  });
});

describe("weeks", () => {
  it("weekday bars and weakest", () => {
    expect(st.weekBars(S, arc, FIX_TODAY).map(r1)).toEqual([100, 83.3, 66.7, 100, 100, 0, 66.7]);
    expect(st.weakestWeekday(st.weekBars(S, arc, FIX_TODAY))).toBe(5);
    expect(st.weekBars(zeroScheduledState(), arc, FIX_TODAY).slice(0, 3).map(r1)).toEqual([100, 66.7, 100]);
    expect(st.weakestWeekday([null, null])).toBeNull();
  });
  it("last 7 days summary", () => {
    const s7 = st.last7Summary(S, arc, FIX_TODAY);
    expect(r1(s7.percent)).toBe(71.4);
    expect(r1(s7.previousPercent)).toBe(88.9);
    expect(r1(s7.change)).toBe(-17.5);
    expect(s7.fullDays).toBe(4);
    expect(s7.days).toBe(7);
    expect(s7.from).toBe("2026-10-08");
    expect(s7.to).toBe(FIX_TODAY);
  });
  it("perfect weeks", () => {
    expect(st.perfectWeeks(S, arc, FIX_TODAY)).toEqual([]);
    const s = fixtureState();
    for (const d of ["06", "10", "11"]) {
      s.logs[`${ARC}:2026-10-${d}`] = { id: `l${d}`, arcId: ARC, date: `2026-10-${d}`, completedHabitIds: [A, B, C, D], updatedAt: "" };
    }
    expect(st.perfectWeeks(s, arc, FIX_TODAY)).toEqual(["2026-10-05"]);
    expect(st.perfectWeeks(s, arc, "2026-10-11")).toEqual(["2026-10-05"]);
    expect(st.perfectWeeks(s, arc, "2026-10-10")).toEqual([]); // week not finished
  });
});

describe("months", () => {
  it("monthly kept rate across arcs", () => {
    const m = st.monthlyKeptRate(S, FIX_TODAY);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ year: 2026, month: 10, kept: 6, days: 10, arcIds: [ARC] });
    expect(r1(m[0]!.rate)).toBe(0.6);
  });
  it("months with no arc are grey gaps", () => {
    const s = fixtureState();
    s.arcs.push({ ...s.arcs[0]!, id: "arc2", startDate: "2026-12-10", lengthDays: 5, name: "Later" });
    const m = st.monthlyKeptRate(s, "2026-12-12");
    expect(m.map((x) => [x.month, x.arcIds.length])).toEqual([[10, 1], [11, 0], [12, 1]]);
    expect(m[1]!.rate).toBeNull();
  });
});

describe("more rules", () => {
  it("arc progress", () => {
    expect(st.arcProgress(arc, "2026-10-01")).toBe(0);
    expect(st.arcProgress(arc, FIX_TODAY)).toBeCloseTo(10 / 14);
    expect(st.arcProgress(arc, "2026-12-01")).toBe(1);
  });
  it("full-day runs", () => {
    expect(st.fullRun(S, arc, FIX_TODAY)).toBe(2); // d8, d9
    expect(st.bestFullRun(S, arc, FIX_TODAY)).toBe(3); // d3-d5
  });
  it("month view buckets", () => {
    expect(st.bucketFor(S, arc, "2026-10-04", FIX_TODAY)).toBe("outside");
    expect(st.bucketFor(S, arc, "2026-10-05", FIX_TODAY)).toBe("full");
    expect(st.bucketFor(S, arc, "2026-10-06", FIX_TODAY)).toBe("some"); // 66.7 below the 80 threshold
    expect(st.bucketFor(S, arc, "2026-10-10", FIX_TODAY)).toBe("unlogged");
    expect(st.bucketFor(S, arc, FIX_TODAY, FIX_TODAY)).toBe("some");
    expect(st.bucketFor(S, arc, "2026-10-15", FIX_TODAY)).toBe("future");
    const s = fixtureState();
    s.logs[`${ARC}:2026-10-10`] = { id: "z", arcId: ARC, date: "2026-10-10", completedHabitIds: [], updatedAt: "" };
    expect(st.bucketFor(s, arc, "2026-10-10", FIX_TODAY)).toBe("zero");
    s.arcs[0]!.threshold = 60;
    expect(st.bucketFor(s, s.arcs[0]!, "2026-10-06", FIX_TODAY)).toBe("most");
  });
  it("perfect week with a zero-scheduled day, and an unfinished Sunday", () => {
    const s = zeroScheduledState();
    for (const d of ["06", "10", "11"]) {
      s.logs[`${ARC}:2026-10-${d}`] = { id: `l${d}`, arcId: ARC, date: `2026-10-${d}`, completedHabitIds: [A, B, C, D], updatedAt: "" };
    }
    // Week of 10-12 has nothing scheduled at all: not perfect.
    expect(st.perfectWeeks(s, arc, "2026-10-18")).toEqual(["2026-10-05"]);
    const t = fixtureState();
    for (const d of ["06", "10"]) {
      t.logs[`${ARC}:2026-10-${d}`] = { id: `l${d}`, arcId: ARC, date: `2026-10-${d}`, completedHabitIds: [A, B, C, D], updatedAt: "" };
    }
    expect(st.perfectWeeks(t, arc, "2026-10-11")).toEqual([]); // Sunday 10-11 is 2 of 3
  });
  it("lifetime counts", () => {
    const life = st.lifetimeCounts(S, FIX_TODAY, (len) => Math.max(7, Math.round(len * 0.78)));
    // fullGrowthDays(14) = 11: no habit has 11 days yet.
    expect(life).toEqual({ fullGrownTrees: 0, flowers: 6, longestStreak: 3, arcsFinished: 0, checkoffs: 24, daysTended: 9 });
    expect(st.lifetimeCounts(S, "2026-11-01", () => 9)).toMatchObject({ fullGrownTrees: 1, arcsFinished: 1 }); // A has 9
  });
});
