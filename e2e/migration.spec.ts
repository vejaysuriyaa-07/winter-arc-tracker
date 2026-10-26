import { expect, test } from "@playwright/test";
import { BACKUP_V1_KEY, V1_KEY, readState, seedRaw } from "./helpers";

const V1 = {
  version: 1,
  settings: { startDate: "2026-10-05", lengthDays: 90, streakThreshold: 75, sleepTargetHours: 8 },
  habits: [
    { id: "h1", name: "Read", detail: "10 pages", category: "mind", order: 0, createdAt: "2026-10-05" },
    { id: "h2", name: "Gym", category: "body", order: 1, createdAt: "2026-10-05", archivedAt: "2026-10-09" },
  ],
  logs: {
    "2026-10-05": { date: "2026-10-05", completedHabitIds: ["h1", "h2"], mood: 4, sleepHours: 7 },
    "2026-10-06": { date: "2026-10-06", completedHabitIds: ["h1"] },
  },
  goals: [{ id: "g", name: "Books", target: 3, current: 1, createdAt: "2026-10-05" }],
  ui: { lastCelebratedLevel: 1 },
};

test("v1 data migrates into a Winter Arc with nothing lost, and the raw data is kept", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-26T12:00:00-07:00"));
  await seedRaw(page, V1_KEY, JSON.stringify(V1));
  await page.goto("#/");
  await expect(page.getByTestId("arc-name")).toHaveText("Winter Arc");
  await expect(page.getByTestId("arc-day")).toHaveText("Day 22 of 90");
  const s = await readState(page);
  const arc = s.arcs[0]!;
  expect(arc).toMatchObject({ name: "Winter Arc", season: "winter", look: "journal", startDate: "2026-10-05", lengthDays: 90, threshold: 75 });
  expect(s.habits.map((h) => [h.name, h.archivedAt])).toEqual([["Read", undefined], ["Gym", "2026-10-09"]]);
  const [read, gym] = s.habits.map((h) => h.id);
  expect(read).toMatch(/^[0-9a-f-]{36}$/); // ids become uuids for sync
  expect(s.logs[`${arc.id}:2026-10-05`]).toMatchObject({ completedHabitIds: [read, gym], mood: "good" });
  expect(s.logs[`${arc.id}:2026-10-06`]!.completedHabitIds).toEqual([read]);
  const backup = await page.evaluate((k) => window.localStorage.getItem(k), BACKUP_V1_KEY);
  expect(JSON.parse(backup!)).toEqual(V1);

  // The old key is left in place (nothing is lost if the first save fails); the v3 key wins from now on.
  expect(await page.evaluate((k) => window.localStorage.getItem(k), V1_KEY)).not.toBeNull();
  await page.reload();
  await expect(page.getByTestId("arc-name")).toHaveText("Winter Arc");
  const again = await readState(page);
  expect(again.arcs.map((a) => a.id)).toEqual([arc.id]);
});
