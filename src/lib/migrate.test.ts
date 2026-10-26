import { describe, expect, it } from "vitest";
import { migrateV1, type V1State } from "./migrate";

const NOW = "2026-10-26T10:00:00.000Z";

// Real v1 exports carry fields v3 drops (sleep, goals, categories): cast, don't narrow.
function v1(): V1State {
  const raw = {
    version: 1,
    settings: { startDate: "2026-10-05", lengthDays: 90, streakThreshold: 75, sleepTargetHours: 8 },
    habits: [
      { id: "h1", name: "Read", detail: "10 pages", category: "mind", order: 0, createdAt: "2026-10-05" },
      { id: "h2", name: "Gym", category: "body", order: 1, createdAt: "2026-10-05", archivedAt: "2026-10-09" },
    ],
    logs: {
      "2026-10-05": { date: "2026-10-05", completedHabitIds: ["h1", "h2"], mood: 4, sleepHours: 7, sleepQuality: 3, journalWin: "x" },
      "2026-10-06": { date: "2026-10-06", completedHabitIds: ["h1"], mood: 1 },
      "2026-10-07": { date: "2026-10-07", completedHabitIds: [] },
    },
    goals: [{ id: "g1", name: "Books", target: 5, current: 2, createdAt: "2026-10-05" }],
    ui: { lastCelebratedLevel: 2 },
  };
  return raw as unknown as V1State;
}

describe("migrateV1", () => {
  it("makes one Winter Arc keeping start, length, threshold, habits and logs", () => {
    const s = migrateV1(v1(), NOW);
    expect(s.version).toBe(3);
    expect(s.arcs).toHaveLength(1);
    const arc = s.arcs[0]!;
    expect(arc).toMatchObject({ name: "Winter Arc", season: "winter", look: "journal", startDate: "2026-10-05", lengthDays: 90, threshold: 75, createdAt: NOW, updatedAt: NOW });
    expect(s.activeArcId).toBe(arc.id);
    expect(s.habits.map((h) => [h.arcId, h.name, h.detail, h.order, h.createdAt, h.archivedAt])).toEqual([
      [arc.id, "Read", "10 pages", 0, "2026-10-05", undefined],
      [arc.id, "Gym", undefined, 1, "2026-10-05", "2026-10-09"],
    ]);
    const [read, gym] = s.habits.map((h) => h.id);
    expect(Object.keys(s.logs)).toEqual([`${arc.id}:2026-10-05`, `${arc.id}:2026-10-06`, `${arc.id}:2026-10-07`]);
    expect(s.logs[`${arc.id}:2026-10-05`]).toMatchObject({ arcId: arc.id, date: "2026-10-05", completedHabitIds: [read, gym], mood: "good" });
    expect(s.logs[`${arc.id}:2026-10-06`]!.mood).toBe("rough");
    expect(s.logs[`${arc.id}:2026-10-07`]!.mood).toBeUndefined();
    expect(s.logs[`${arc.id}:2026-10-05`]).not.toHaveProperty("sleepHours");
    expect(s.visitors).toEqual([]);
    expect(s.settings).toMatchObject({ autoNight: true, haptics: true, sounds: true, motion: true, nudge: false, recap: false });
    expect(s.ui).toEqual({ celebrated: {}, recapSeen: [], signInPrompted: false, notificationsPrompted: false });
    expect(s.sync.queue).toEqual([]);
  });
  it("mood mapping 1..5", () => {
    const raw = v1();
    raw.logs = Object.fromEntries(
      [1, 2, 3, 4, 5].map((m) => [`2026-10-1${m}`, { date: `2026-10-1${m}`, completedHabitIds: [], mood: m }]),
    );
    const s = migrateV1(raw, NOW);
    expect(Object.values(s.logs).map((l) => l.mood)).toEqual(["rough", "low", "okay", "good", "great"]);
  });
  it("ids are uuids and every record has updatedAt", () => {
    const s = migrateV1(v1(), NOW);
    expect(s.arcs[0]!.id).toMatch(/^[0-9a-f-]{36}$/);
    for (const h of s.habits) expect(h.id).toMatch(/^[0-9a-f-]{36}$/);
    for (const l of Object.values(s.logs)) expect(l.id).toMatch(/^[0-9a-f-]{36}$/);
    for (const l of Object.values(s.logs)) expect(l.updatedAt).toBe(NOW);
    for (const h of s.habits) expect(h.updatedAt).toBe(NOW);
  });
});
