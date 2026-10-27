// Migration of stored or exported data from older versions into the v3 model.
// v1 (Winter Arc Tracker) becomes one arc named "Winter Arc". Goals, sleep and
// levels are dropped; the raw v1 data is parked by storage.ts under a backup key.
import type { AppState, DayLog, Habit, Mood } from "../types";
import { logKey } from "../types";
import { newId, stableId } from "./ids";

/** Loose view of the v1 shape; validateState has already checked it when data comes from storage. */
export type V1State = {
  version: 1;
  settings: { startDate: string; lengthDays: number; streakThreshold: number };
  habits: { id: string; name: string; detail?: string; order: number; createdAt: string; archivedAt?: string }[];
  logs: Record<string, { date: string; completedHabitIds: string[]; mood?: number }>;
};

const MOODS: Record<number, Mood> = { 1: "rough", 2: "low", 3: "okay", 4: "good", 5: "great" };

export function migrateV1(v1: V1State, now: string): AppState {
  const arcId = newId();
  // v1 ids were not always uuids; sync needs uuids, so every habit gets a new id.
  const ids = new Map(v1.habits.map((h) => [h.id, newId()]));
  const habits: Habit[] = v1.habits.map((h) => {
    const out: Habit = { id: ids.get(h.id)!, arcId, name: h.name, order: h.order, createdAt: h.createdAt, updatedAt: now };
    if (h.detail !== undefined) out.detail = h.detail;
    if (h.archivedAt !== undefined) out.archivedAt = h.archivedAt;
    return out;
  });
  const logs: Record<string, DayLog> = {};
  for (const l of Object.values(v1.logs)) {
    const out: DayLog = { id: stableId(`log:${arcId}:${l.date}`), arcId, date: l.date, completedHabitIds: l.completedHabitIds.flatMap((id) => (ids.has(id) ? [ids.get(id)!] : [])), updatedAt: now };
    const mood = l.mood === undefined ? undefined : MOODS[l.mood];
    if (mood) out.mood = mood;
    logs[logKey(arcId, l.date)] = out;
  }
  return {
    version: 3,
    arcs: [
      {
        id: arcId,
        name: "Winter Arc",
        season: "winter",
        look: "journal",
        startDate: v1.settings.startDate,
        lengthDays: v1.settings.lengthDays,
        threshold: v1.settings.streakThreshold,
        createdAt: now,
        updatedAt: now,
      },
    ],
    activeArcId: arcId,
    habits,
    logs,
    visitors: [],
    settings: { autoNight: true, haptics: true, sounds: true, motion: true, nudge: false, recap: false, updatedAt: now },
    ui: { celebrated: {}, recapSeen: [], signInPrompted: false, notificationsPrompted: false },
    sync: { queue: [] },
  };
}
