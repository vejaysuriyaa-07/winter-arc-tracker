import { describe, expect, it } from "vitest";
import {
  CHECKOFFS_PER_LEVEL,
  TREE_STAGES,
  arcDayNumber,
  arcMonths,
  bucketFor,
  arcDaysSoFar,
  arcEnd,
  arcPhase,
  averagePercent,
  currentStreak,
  dailyCompletion,
  dailySeries,
  daysLeft,
  habitConsistency,
  hasAnyCheckoff,
  isKept,
  leaderboard,
  level,
  levelProgress,
  lifetimeCheckoffs,
  longestStreak,
  monthAverage,
  overallConsistency,
  scheduledHabits,
  sleepScore,
  sleepSummary,
  treeStage,
  weakestWeekday,
  weekAverage,
  weekdayAverages,
} from "./stats";
import { A, B, C, D, FIX_START, FIX_TODAY, Z, fixtureState, zeroScheduledState } from "./stats.fixture";

const S = fixtureState();
const T = FIX_TODAY;
const ids = (hs: { id: string }[]) => hs.map((h) => h.id);

describe("arc window", () => {
  it("knows the arc end, day number and days left", () => {
    expect(arcEnd(S.settings)).toBe("2026-10-18");
    expect(arcDayNumber(S.settings, T)).toBe(10);
    expect(daysLeft(S.settings, T)).toBe(4);
    expect(arcDayNumber(S.settings, FIX_START)).toBe(1);
  });
  it("reports before / active / complete", () => {
    expect(arcPhase(S.settings, "2026-10-04")).toBe("before");
    expect(arcPhase(S.settings, FIX_START)).toBe("active");
    expect(arcPhase(S.settings, "2026-10-18")).toBe("active");
    expect(arcPhase(S.settings, "2026-10-19")).toBe("complete");
  });
  it("lists arc days so far, clamped to the arc end", () => {
    expect(arcDaysSoFar(S.settings, T)).toHaveLength(10);
    expect(arcDaysSoFar(S.settings, T)[0]).toBe(FIX_START);
    expect(arcDaysSoFar(S.settings, T)[9]).toBe(T);
    expect(arcDaysSoFar(S.settings, "2026-10-04")).toEqual([]);
    expect(arcDaysSoFar(S.settings, "2026-12-01")).toHaveLength(14);
  });
});

describe("scheduledHabits", () => {
  it("follows createdAt and archivedAt", () => {
    expect(ids(scheduledHabits(S.habits, "2026-10-05"))).toEqual([A, B, C]);
    expect(ids(scheduledHabits(S.habits, "2026-10-08"))).toEqual([A, B, C, D]);
    expect(ids(scheduledHabits(S.habits, "2026-10-09"))).toEqual([A, C, D]); // B archived that day
    expect(ids(scheduledHabits(S.habits, "2026-10-20"))).toEqual([A, C, D, Z]);
    expect(ids(scheduledHabits(S.habits, "2026-10-01"))).toEqual([]);
  });
  it("returns habits in list order", () => {
    const shuffled = { ...S, habits: [...S.habits].reverse() };
    expect(ids(scheduledHabits(shuffled.habits, "2026-10-08"))).toEqual([A, B, C, D]);
  });
});

describe("dailyCompletion", () => {
  it("matches the worked values", () => {
    expect(dailyCompletion(S, "2026-10-05")).toEqual({ scheduled: 3, completed: 3, percent: 100, logged: true });
    expect(dailyCompletion(S, "2026-10-06").percent).toBeCloseTo(66.67, 1);
    expect(dailyCompletion(S, "2026-10-08")).toEqual({ scheduled: 4, completed: 4, percent: 100, logged: true });
    expect(dailyCompletion(S, "2026-10-10")).toEqual({ scheduled: 3, completed: 0, percent: 0, logged: false });
    expect(dailyCompletion(S, "2026-10-14").percent).toBeCloseTo(33.33, 1);
  });
  it("ignores check-offs of habits not scheduled that day", () => {
    expect(dailyCompletion(S, "2026-10-13")).toEqual({ scheduled: 3, completed: 3, percent: 100, logged: true });
  });
  it("returns a null percent when nothing is scheduled", () => {
    expect(dailyCompletion(zeroScheduledState(), "2026-10-13")).toEqual({
      scheduled: 0,
      completed: 0,
      percent: null,
      logged: true,
    });
  });
});

describe("overallConsistency", () => {
  it("is all completed over all scheduled across arc days so far", () => {
    const r = overallConsistency(S, T);
    expect(r.completed).toBe(24);
    expect(r.scheduled).toBe(31);
    expect(r.percent).toBeCloseTo(77.42, 1);
  });
  it("skips zero-scheduled days and is null before the arc", () => {
    const r = overallConsistency(zeroScheduledState(), T);
    expect(r).toMatchObject({ completed: 17, scheduled: 22 });
    expect(r.percent).toBeCloseTo(77.27, 1);
    expect(overallConsistency(S, "2026-10-01").percent).toBeNull();
  });
});

describe("streaks", () => {
  it("kept means completion at or above the threshold", () => {
    expect(isKept(S, "2026-10-05")).toBe(true);
    expect(isKept(S, "2026-10-06")).toBe(false);
    expect(isKept(S, "2026-10-10")).toBe(false);
    expect(isKept(zeroScheduledState(), "2026-10-13")).toBeNull();
  });
  it("current streak counts back from yesterday when today is not kept yet", () => {
    expect(currentStreak(S, T)).toBe(2);
  });
  it("current streak includes today once today is kept", () => {
    const s = fixtureState();
    s.logs["2026-10-14"] = { date: "2026-10-14", completedHabitIds: [A, C, D] };
    expect(currentStreak(s, T)).toBe(3);
  });
  it("longest streak is the longest run inside the arc", () => {
    expect(longestStreak(S, T)).toBe(3);
  });
  it("days before the arc do not count", () => {
    const s = fixtureState();
    // A, B, C exist before the arc, and 10-02, 10-03, 10-04 are 100% days right before day 1.
    for (const d of ["2026-10-02", "2026-10-03", "2026-10-04"]) s.logs[d] = { date: d, completedHabitIds: [A, B, C] };
    s.habits = s.habits.map((h) => ([A, B, C].includes(h.id) ? { ...h, createdAt: "2026-10-01" } : h));
    expect(isKept(s, "2026-10-04")).toBe(true);
    expect(longestStreak(s, T)).toBe(3); // 10-02..10-04 + d1 would be 4 if pre-arc days counted
  });
  it("zero-scheduled days neither keep nor break a streak", () => {
    const z = zeroScheduledState();
    expect(currentStreak(z, T)).toBe(0);
    expect(longestStreak(z, T)).toBe(3);
  });
  it("after the arc ends, streaks are evaluated at the arc's last day", () => {
    const s = fixtureState();
    for (const d of ["2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]) {
      s.logs[d] = { date: d, completedHabitIds: [A, C, D] };
    }
    // d8, d9 kept, d10 (33%) not, d11-d14 kept -> current 4 (ending at arc end), longest 4
    expect(currentStreak(s, "2026-11-30")).toBe(4);
    expect(longestStreak(s, "2026-11-30")).toBe(4);
  });
  it("a not-kept final arc day breaks the streak once the arc is over", () => {
    const s = fixtureState();
    for (const d of ["2026-10-15", "2026-10-16", "2026-10-17"]) {
      s.logs[d] = { date: d, completedHabitIds: [A, C, D] };
    }
    // d14 (10-18) unlogged. While the arc is live it is "in progress"; after the arc it is a 0% day.
    expect(currentStreak(s, "2026-10-18")).toBe(3);
    expect(currentStreak(s, "2026-11-30")).toBe(0);
  });
  it("is zero before any arc day", () => {
    expect(currentStreak(S, "2026-10-04")).toBe(0);
    expect(longestStreak(S, "2026-10-04")).toBe(0);
  });
});

describe("habit consistency and leaderboard", () => {
  it("counts days scheduled and completed per habit", () => {
    const byId = (id: string) => S.habits.find((h) => h.id === id)!;
    expect(habitConsistency(S, byId(A), T)).toMatchObject({ scheduledDays: 10, completedDays: 9 });
    expect(habitConsistency(S, byId(B), T)).toMatchObject({ scheduledDays: 4, completedDays: 3 });
    expect(habitConsistency(S, byId(C), T)).toMatchObject({ scheduledDays: 10, completedDays: 8 });
    expect(habitConsistency(S, byId(D), T)).toMatchObject({ scheduledDays: 7, completedDays: 4 });
    expect(habitConsistency(S, byId(D), T).percent).toBeCloseTo(57.14, 1);
    expect(habitConsistency(S, byId(Z), T)).toEqual({ scheduledDays: 0, completedDays: 0, percent: null });
  });
  it("ranks active habits best first, archived dimmed at the bottom", () => {
    const rows = leaderboard(S, T);
    expect(rows.map((r) => r.habit.id)).toEqual([A, C, D, Z, B]);
    expect(rows.map((r) => r.archived)).toEqual([false, false, false, false, true]);
  });
  it("breaks ties alphabetically", () => {
    const s = fixtureState();
    // Rename Alpha to sort after Charlie, then give both 9 / 10 so only the name separates them.
    s.habits = s.habits.map((h) => (h.id === A ? { ...h, name: "Zed" } : h));
    s.logs["2026-10-14"] = { date: "2026-10-14", completedHabitIds: [A, C] }; // A 9/10, C 9/10
    expect(leaderboard(s, T).map((r) => r.habit.id).slice(0, 2)).toEqual([C, A]);
  });
});

describe("averages", () => {
  it("week averages over arc days so far", () => {
    expect(weekAverage(S, "2026-10-05", T)).toBeCloseTo(76.19, 1);
    expect(weekAverage(S, "2026-10-12", T)).toBeCloseTo(77.78, 1);
    expect(weekAverage(S, "2026-10-19", T)).toBeNull();
    expect(weekAverage(S, "2026-09-28", T)).toBeNull();
  });
  it("month average over arc days so far", () => {
    expect(monthAverage(S, { year: 2026, month: 10 }, T)).toBeCloseTo(76.67, 1);
    expect(monthAverage(S, { year: 2026, month: 11 }, T)).toBeNull();
  });
  it("averagePercent skips zero-scheduled days", () => {
    const z = zeroScheduledState();
    expect(weekAverage(z, "2026-10-12", T)).toBeNull();
    expect(monthAverage(z, { year: 2026, month: 10 }, T)).toBeCloseTo(76.19, 1);
    expect(averagePercent(z, ["2026-10-12", "2026-10-13"], T)).toBeNull();
  });
  it("weekday averages Mon to Sun with the weakest highlighted", () => {
    const w = weekdayAverages(S, T);
    expect(w[0]).toBeCloseTo(100, 5);
    expect(w[1]).toBeCloseTo(83.33, 1);
    expect(w[2]).toBeCloseTo(66.67, 1);
    expect(w[3]).toBeCloseTo(100, 5);
    expect(w[4]).toBeCloseTo(100, 5);
    expect(w[5]).toBeCloseTo(0, 5);
    expect(w[6]).toBeCloseTo(66.67, 1);
    expect(weakestWeekday(w)).toBe(5);
  });
  it("weakest weekday picks the first in Mon-Sun order on a tie and ignores empty weekdays", () => {
    expect(weakestWeekday([null, 50, 50, null, null, null, null])).toBe(1);
    expect(weakestWeekday([null, null, null, null, null, null, null])).toBeNull();
    const z = weekdayAverages(zeroScheduledState(), T);
    expect(z[0]).toBeCloseTo(100, 5);
    expect(z[1]).toBeCloseTo(66.67, 1);
  });
});

describe("sleep", () => {
  it("scores a night from hours and quality", () => {
    expect(sleepScore(7, 4, 8)).toBeCloseTo(83.75, 5);
    expect(sleepScore(8, 5, 8)).toBe(100);
    expect(sleepScore(9, 3, 8)).toBe(80); // hours capped at the target
  });
  it("summarises only nights with data", () => {
    const r = sleepSummary(S, T);
    expect(r.nights).toBe(4);
    expect(r.avgHours).toBeCloseTo(7.5, 5);
    expect(r.avgScore).toBeCloseTo(87.92, 1);
    expect(r.series).toHaveLength(10);
    expect(r.series[3]).toEqual({ date: "2026-10-08", hours: 6, score: null });
    expect(r.series[5]).toEqual({ date: "2026-10-10", hours: null, score: null });
  });
  it("is empty with no entries", () => {
    const s = fixtureState();
    for (const l of Object.values(s.logs)) {
      delete l.sleepHours;
      delete l.sleepQuality;
    }
    expect(sleepSummary(s, T)).toMatchObject({ nights: 0, avgHours: null, avgScore: null });
  });
});

describe("level and tree", () => {
  it("counts lifetime check-offs across all logs, scheduled only", () => {
    expect(lifetimeCheckoffs(S)).toBe(24);
    expect(hasAnyCheckoff(S)).toBe(true);
    expect(hasAnyCheckoff({ ...S, logs: {} })).toBe(false);
  });
  it("level is floor(lifetime / 50) + 1", () => {
    expect(CHECKOFFS_PER_LEVEL).toBe(50);
    expect(level(0)).toBe(1);
    expect(level(49)).toBe(1);
    expect(level(50)).toBe(2);
    expect(level(132)).toBe(3);
    expect(levelProgress(132)).toEqual({ level: 3, into: 32, needed: 50, next: 4 });
    expect(levelProgress(24)).toEqual({ level: 1, into: 24, needed: 50, next: 2 });
  });
  it("tree stage thresholds are 0 / 50 / 150 / 300 / 500", () => {
    expect(TREE_STAGES.map((s) => s.min)).toEqual([0, 50, 150, 300, 500]);
    expect(treeStage(0).name).toBe("seed");
    expect(treeStage(24).name).toBe("seed");
    expect(treeStage(50).name).toBe("sprout");
    expect(treeStage(149).name).toBe("sprout");
    expect(treeStage(150).name).toBe("sapling");
    expect(treeStage(300).name).toBe("tree");
    expect(treeStage(9999).name).toBe("blooming");
  });
});

describe("dailySeries", () => {
  it("plots arc days so far with logged and today flags", () => {
    const s = dailySeries(S, T);
    expect(s).toHaveLength(10);
    expect(s[0]).toEqual({ date: "2026-10-05", percent: 100, logged: true, isToday: false });
    expect(s[5]).toEqual({ date: "2026-10-10", percent: 0, logged: false, isToday: false });
    expect(s[9]).toMatchObject({ date: "2026-10-14", logged: true, isToday: true });
    expect(s[9]!.percent).toBeCloseTo(33.33, 1);
  });
});

describe("calendar buckets", () => {
  it("maps a day to its shading bucket", () => {
    expect(bucketFor({ percent: null, logged: false })).toBe("unlogged");
    expect(bucketFor({ percent: 0, logged: false })).toBe("unlogged");
    expect(bucketFor({ percent: 0, logged: true })).toBe("zero");
    expect(bucketFor({ percent: null, logged: true })).toBe("zero"); // logged, nothing scheduled
    expect(bucketFor({ percent: 1, logged: true })).toBe("low");
    expect(bucketFor({ percent: 49.9, logged: true })).toBe("low");
    expect(bucketFor({ percent: 50, logged: true })).toBe("mid");
    expect(bucketFor({ percent: 79.9, logged: true })).toBe("mid");
    expect(bucketFor({ percent: 80, logged: true })).toBe("high");
    expect(bucketFor({ percent: 99.9, logged: true })).toBe("high");
    expect(bucketFor({ percent: 100, logged: true })).toBe("full");
  });
  it("lists the months that overlap the arc", () => {
    const s = fixtureState();
    expect(arcMonths(s.settings)).toEqual([{ year: 2026, month: 10 }]);
    s.settings.lengthDays = 90; // 10-05 .. 2027-01-02
    expect(arcMonths(s.settings)).toEqual([
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });
});
