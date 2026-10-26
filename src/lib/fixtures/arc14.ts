// Hand-computed fixture for stats.test.ts. Every expected value below is worked
// out by hand in the comments so the tests check the rules, not the code.
//
// Arc "Winter Arc" (id ARC): starts Mon 2026-10-05, 14 days long (ends Sun 2026-10-18).
// Today: Wed 2026-10-14 (day 10 of 14, in progress). Threshold 80%.
//
// Habits
//   A "Alpha"   created 2026-10-05 (day 1)
//   B "Bravo"   created 2026-10-05, archived 2026-10-09 (scheduled days 1-4 only)
//   C "Charlie" created 2026-10-05
//   D "Delta"   created 2026-10-08 (day 4), scheduled from day 4 on
//   Z "Zulu"    created 2026-10-20, after today: never scheduled so far
//   X "Xray"    deleted tombstone: must be ignored everywhere
//
// Scheduled per day (A, B, C from day 1; B stops day 5; D starts day 4):
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
//   total scheduled d1..d10 = 31
//
// Logs (completed ids) and completion %
//   d1  A B C        3/3 = 100%  kept, full
//   d2  A C          2/3 = 66.7% not kept
//   d3  A B C        3/3 = 100%  kept, full
//   d4  A B C D      4/4 = 100%  kept, full
//   d5  A C D        3/3 = 100%  kept, full
//   d6  (no log)     0/3 = 0%    not kept  (unlogged day)
//   d7  A C          2/3 = 66.7% not kept
//   d8  A C D        3/3 = 100%  kept, full
//   d9  A C D + B    3/3 = 100%  kept, full (B is not scheduled: its check-off is ignored)
//   d10 A            1/3 = 33.3% not kept yet (today, in progress)
//   total completed (scheduled only) = 3+2+3+4+3+0+2+3+3+1 = 24
//
// Arc score = 24 / 31 = 77.419...% -> 77.4
// Kept days d1..d10 = 6 (d1 d3 d4 d5 d8 d9); full days = 6 (every kept day is 100%)
//
// Chain (threshold 80): today not kept, so count back from d9: d9, d8 kept, d7 not -> 2
// Best chain: d3-d4-d5 = 3 (broken by d6 unlogged)
// Chain strip, last 7 days d4..d10: full full missed missed full full pending
//
// Per-habit over arc days so far (d1..d10)
//   A: scheduled 10, done d1,2,3,4,5,7,8,9,10 = 9 -> 90.0%   streak 4 (d7-d10)  best 5 (d1-d5)
//   B: scheduled 4 (d1..d4), done d1,3,4 = 3 -> 75.0%        streak 2 (d3-d4, ends at its last scheduled day) best 2
//   C: scheduled 10, done d1,2,3,4,5,7,8,9 = 8 -> 80.0%      streak 3 (d7-d9; today not done) best 5
//   D: scheduled 7 (d4..d10), done d4,5,8,9 = 4 -> 57.1%     streak 2 (d8-d9) best 2
//   Z: scheduled 0 -> no sample, streak 0
//
// Weekday averages (Mon..Sun), arc days with something scheduled
//   Mon: d1 100, d8 100 -> 100
//   Tue: d2 66.7, d9 100 -> 83.3
//   Wed: d3 100, d10 33.3 -> 66.7
//   Thu: d4 100 -> 100
//   Fri: d5 100 -> 100
//   Sat: d6 0 -> 0          <- weakest (index 5)
//   Sun: d7 66.7 -> 66.7
//
// Last 7 days (d4..d10): (100+100+0+66.7+100+100+33.3)/7 = 500/7 = 71.43 -> 71.4
//   previous 7 (10-01..10-07, arc days d1..d3 only): (100+66.7+100)/3 = 88.89 -> 88.9
//   change = 71.43 - 88.89 = -17.46 -> -17.5
//   full days in the last 7 = d4 d5 d8 d9 = 4
//
// Perfect weeks: week of 10-05 has d2, d6, d7 not full -> none.
// Monthly kept rate, Oct 2026: 6 kept of 10 scored days -> 0.6
import type { AppState, Arc, Habit } from "../../types";
import { logKey } from "../../types";

export const FIX_TODAY = "2026-10-14";
export const FIX_START = "2026-10-05";
export const FIX_NOW = "2026-10-14T12:00:00.000Z";
export const ARC = "arc-winter";

export const A = "h-alpha";
export const B = "h-bravo";
export const C = "h-charlie";
export const D = "h-delta";
export const Z = "h-zulu";
export const X = "h-xray";

const T = "2026-10-05T08:00:00.000Z";

export function fixtureArc(): Arc {
  return {
    id: ARC,
    name: "Winter Arc",
    season: "winter",
    look: "journal",
    startDate: FIX_START,
    lengthDays: 14,
    threshold: 80,
    createdAt: T,
    updatedAt: T,
  };
}

function habit(id: string, name: string, order: number, createdAt: string, extra: Partial<Habit> = {}): Habit {
  return { id, arcId: ARC, name, order, createdAt, updatedAt: T, ...extra };
}

export function fixtureState(): AppState {
  const log = (date: string, ids: string[], mood?: AppState["logs"][string]["mood"]) => {
    const l: AppState["logs"][string] = { id: `log-${date}`, arcId: ARC, date, completedHabitIds: ids, updatedAt: T };
    if (mood) l.mood = mood;
    return l;
  };
  const logs = [
    log("2026-10-01", [A, C]), // before the arc: ignored by every arc stat
    log("2026-10-05", [A, B, C], "good"),
    log("2026-10-06", [A, C], "great"),
    log("2026-10-07", [A, B, C]),
    log("2026-10-08", [A, B, C, D]),
    log("2026-10-09", [A, C, D], "low"),
    log("2026-10-11", [A, C]),
    log("2026-10-12", [A, C, D]),
    log("2026-10-13", [A, C, D, B]),
    log("2026-10-14", [A]),
  ];
  return {
    version: 3,
    arcs: [fixtureArc()],
    activeArcId: ARC,
    habits: [
      habit(A, "Alpha", 0, "2026-10-05"),
      habit(B, "Bravo", 1, "2026-10-05", { archivedAt: "2026-10-09" }),
      habit(C, "Charlie", 2, "2026-10-05", { detail: "10 pages" }),
      habit(D, "Delta", 3, "2026-10-08"),
      habit(Z, "Zulu", 4, "2026-10-20"),
      habit(X, "Xray", 5, "2026-10-05", { deleted: true }),
    ],
    logs: Object.fromEntries(logs.map((l) => [logKey(ARC, l.date), l])),
    visitors: [],
    settings: { autoNight: true, haptics: true, sounds: true, motion: true, nudge: false, recap: false, updatedAt: T },
    ui: { celebrated: {}, recapSeen: [], signInPrompted: false, notificationsPrompted: false },
    sync: { queue: [] },
  };
}

// Zero-scheduled variant: every habit is archived from d8 (2026-10-12) and Z is never created.
// Then d8, d9, d10 have 0 scheduled habits.
//   scored days = d1..d7 only: completed 17, scheduled 22 -> 77.27 -> 77.3
//   kept: d1, d3, d4, d5. d6 and d7 not kept. d8..d10 skipped (neither kept nor broken).
//   chain: today d10 skipped, d9 skipped, d8 skipped, d7 not kept -> 0 ; best 3
//   weekday Mon: d1 only -> 100 ; Tue: d2 only -> 66.7 ; Wed: d3 only -> 100
export function zeroScheduledState(): AppState {
  const s = fixtureState();
  s.habits = s.habits
    .filter((h) => h.id !== Z)
    .map((h) => (h.archivedAt === undefined ? { ...h, archivedAt: "2026-10-12" } : h));
  return s;
}
