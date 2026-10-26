// Hand-computed fixture for stats.test.ts. Every expected value below is worked
// out by hand in the comments so the tests check the rules, not the code.
//
// Arc: starts Mon 2026-10-05, 14 days long (ends Sun 2026-10-18).
// Today: Wed 2026-10-14 (day 10 of 14, in progress). Threshold 80%.
//
// Habits
//   A "Alpha"  created 2026-10-05 (day 1)
//   B "Bravo"  created 2026-10-05, archived 2026-10-09 (scheduled days 1-4 only)
//   C "Charlie" created 2026-10-05
//   D "Delta"  created 2026-10-08 (day 4), scheduled from day 4 on
//   Z "Zulu"   created 2026-10-20, after today: never scheduled so far
//   Zero-scheduled day: for the "no habits" case the test builds a variant
//   where every habit is archived from 2026-10-12 (day 8) onward; see below.
//
// Scheduled per day (A, B, C always from day 1; B stops day 5; D starts day 4):
//   d1 10-05 Mon: A B C          (3)
//   d2 10-06 Tue: A B C          (3)
//   d3 10-07 Wed: A B C          (3)
//   d4 10-08 Thu: A B C D        (4)
//   d5 10-09 Fri: A C D          (3)
//   d6 10-10 Sat: A C D          (3)
//   d7 10-11 Sun: A C D          (3)
//   d8 10-12 Mon: A C D          (3)
//   d9 10-13 Tue: A C D          (3)
//   d10 10-14 Wed: A C D         (3)  <- today
//   total scheduled d1..d10 = 3+3+3+4+3+3+3+3+3+3 = 31
//
// Logs (completed ids) and completion %
//   d1  A B C        3/3 = 100%  kept   (100% day)
//   d2  A C          2/3 = 66.7% not kept
//   d3  A B C        3/3 = 100%  kept
//   d4  A B C D      4/4 = 100%  kept
//   d5  A C D        3/3 = 100%  kept
//   d6  (no log)     0/3 = 0%    not kept  (unlogged day)
//   d7  A C          2/3 = 66.7% not kept
//   d8  A C D        3/3 = 100%  kept
//   d9  A C D + B    3/3 = 100%  kept   (B is not scheduled: its check-off is ignored)
//   d10 A            1/3 = 33.3% not kept yet (today, in progress)
//   total completed (scheduled only) = 3+2+3+4+3+0+2+3+3+1 = 24
//
// Overall consistency = 24 / 31 = 77.419...% -> 77.4
//
// Streaks (threshold 80): kept = d1, d3, d4, d5, d8, d9
//   current: today not kept, so count back from d9: d9, d8 kept, d7 not -> 2
//   longest: d3-d4-d5 = 3 (broken by d6 unlogged)
//
// Per-habit consistency over arc days so far (d1..d10)
//   A: scheduled 10 days, completed d1,2,3,4,5,7,8,9,10 = 9 -> 90.0%  (9 / 10)
//   B: scheduled d1..d4 = 4, completed d1,3,4 = 3 -> 75.0% (3 / 4), archived
//   C: scheduled 10, completed d1,2,3,4,5,7,8,9 = 8 -> 80.0% (8 / 10)
//   D: scheduled d4..d10 = 7, completed d4,5,8,9 = 4 -> 57.1% (4 / 7)
//   Z: scheduled 0, completed 0 -> no sample
//   leaderboard (active, best first, ties alphabetical): A 90, C 80, D 57.1; then archived B 75
//
// Week averages (Mon-first weeks)
//   week of 10-05 (d1..d7): (100 + 66.7 + 100 + 100 + 100 + 0 + 66.7) / 7 = 533.33/7 = 76.19 -> 76.2
//   week of 10-12 (d8..d10 so far): (100 + 100 + 33.3) / 3 = 77.78 -> 77.8
// Month average (October, arc days so far d1..d10): 766.67 / 10 = 76.67 -> 76.7
//
// Weekday averages (Mon..Sun)
//   Mon: d1 100, d8 100 -> 100
//   Tue: d2 66.7, d9 100 -> 83.3
//   Wed: d3 100, d10 33.3 -> 66.7
//   Thu: d4 100 -> 100
//   Fri: d5 100 -> 100
//   Sat: d6 0 -> 0          <- weakest
//   Sun: d7 66.7 -> 66.7
//
// Sleep (target 8h). Score = 50*min(h/8,1) + 50*(q/5), only when both present.
//   d1 7h q4 -> 43.75 + 40 = 83.75
//   d2 8h q5 -> 50 + 50 = 100
//   d3 9h q3 -> 50 + 30 = 80
//   d4 6h, no quality -> no score (hours still count toward the average)
//   average hours = (7+8+9+6)/4 = 7.5 ; average score = (83.75+100+80)/3 = 87.9
//
// Lifetime check-offs = completed scheduled across ALL logs. There is also a
// pre-arc log on 2026-10-01 with A and C checked (A and C were not created yet
// on 10-01, so those check-offs are ignored): lifetime = 24.
//   level = floor(24 / 50) + 1 = 1 ; progress 24 / 50 to level 2
//   tree stage: 24 < 50 -> "seed"
import type { AppState } from "../types";

export const FIX_TODAY = "2026-10-14";
export const FIX_START = "2026-10-05";

export const A = "h-alpha";
export const B = "h-bravo";
export const C = "h-charlie";
export const D = "h-delta";
export const Z = "h-zulu";

export function fixtureState(): AppState {
  const log = (date: string, ids: string[], extra: Partial<AppState["logs"][string]> = {}) => ({
    date,
    completedHabitIds: ids,
    ...extra,
  });
  return {
    version: 1,
    settings: { startDate: FIX_START, lengthDays: 14, streakThreshold: 80, sleepTargetHours: 8 },
    habits: [
      { id: A, name: "Alpha", category: "morning", order: 0, createdAt: "2026-10-05" },
      { id: B, name: "Bravo", category: "mind", order: 1, createdAt: "2026-10-05", archivedAt: "2026-10-09" },
      { id: C, name: "Charlie", category: "body", order: 2, createdAt: "2026-10-05" },
      { id: D, name: "Delta", category: "discipline", order: 3, createdAt: "2026-10-08" },
      { id: Z, name: "Zulu", category: "custom", order: 4, createdAt: "2026-10-20" },
    ],
    logs: {
      "2026-10-01": log("2026-10-01", [A, C]),
      "2026-10-05": log("2026-10-05", [A, B, C], { sleepHours: 7, sleepQuality: 4, mood: 4 }),
      "2026-10-06": log("2026-10-06", [A, C], { sleepHours: 8, sleepQuality: 5, mood: 5 }),
      "2026-10-07": log("2026-10-07", [A, B, C], { sleepHours: 9, sleepQuality: 3 }),
      "2026-10-08": log("2026-10-08", [A, B, C, D], { sleepHours: 6 }),
      "2026-10-09": log("2026-10-09", [A, C, D], { mood: 2 }),
      "2026-10-11": log("2026-10-11", [A, C]),
      "2026-10-12": log("2026-10-12", [A, C, D]),
      "2026-10-13": log("2026-10-13", [A, C, D, B]),
      "2026-10-14": log("2026-10-14", [A]),
    },
    goals: [],
    ui: { lastCelebratedLevel: 1 },
  };
}

// Zero-scheduled variant: same arc, but every habit is archived from d8
// (2026-10-12) and Z is never created. Then d8, d9, d10 have 0 scheduled habits.
//   arc days so far d1..d10; scored days = d1..d7 only
//   completed d1..d7 = 3+2+3+4+3+0+2 = 17 ; scheduled = 3+3+3+4+3+3+3 = 22
//   overall = 17/22 = 77.27 -> 77.3
//   kept: d1, d3, d4, d5. d6 and d7 not kept. d8..d10 skipped (neither kept nor broken).
//   current streak: today d10 skipped, d9 skipped, d8 skipped, d7 not kept -> 0
//   longest: d3-d4-d5 = 3
//   week of 10-12: no scored days -> null
//   month average: 533.33 / 7 = 76.19 -> 76.2
//   weekday Mon: d1 only -> 100 ; Tue: d2 only -> 66.7 ; Wed: d3 only -> 100
export function zeroScheduledState(): AppState {
  const s = fixtureState();
  s.habits = s.habits
    .filter((h) => h.id !== Z)
    .map((h) => (h.archivedAt === undefined ? { ...h, archivedAt: "2026-10-12" } : h));
  return s;
}
