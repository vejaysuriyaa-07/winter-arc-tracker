import { expect, test } from "@playwright/test";
import { SHOTS, STORAGE_KEY, defaultState, readState, seed, todayLocal } from "./helpers";
import { addDays } from "../src/lib/dates";

test("goals: add, count, remove; tree stage shown", async ({ page }) => {
  await page.goto("#/goals");
  await expect(page.getByTestId("tree")).toHaveAttribute("data-stage", "seed");
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await page.getByLabel("Goal name").fill("Books read");
  await page.getByLabel("Target").fill("12");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByTestId("goal")).toHaveCount(1);
  await page.getByRole("button", { name: "Increase Books read" }).click();
  await page.getByRole("button", { name: "Increase Books read" }).click();
  await page.getByRole("button", { name: "Decrease Books read" }).click();
  await expect(page.getByTestId("goal-current")).toHaveText("1");
  await page.screenshot({ path: `${SHOTS}/goals-data.png`, fullPage: true });
  await page.reload();
  await expect(page.getByTestId("goal-current")).toHaveText("1");
  await page.getByRole("button", { name: "Remove" }).click();
  await page.getByTestId("confirm-yes").click();
  await expect(page.getByTestId("goal")).toHaveCount(0);
});

test("settings: edit, reorder, delete habit; scoring sheet; reset", async ({ page }) => {
  const today = todayLocal();
  const s = defaultState(addDays(today, -5));
  const d0 = s.settings.startDate;
  s.logs[d0] = { date: d0, completedHabitIds: s.habits.slice(0, 8).map((h) => h.id) }; // 8/9 = 89%
  await seed(page, s);
  await page.goto("#/settings");
  await page.screenshot({ path: `${SHOTS}/settings-data.png`, fullPage: true });

  // Rename Gym
  await page.getByRole("button", { name: "Edit Gym" }).click();
  await page.getByLabel("Habit name").fill("Lift");
  await page.getByLabel("Habit detail").fill("45 min");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator('[data-habit="Lift"]')).toContainText("45 min");

  // Move Meditation to the top
  await page.getByRole("button", { name: "Move Meditation up" }).click();
  await expect(page.getByTestId("settings-habits").locator("li").first()).toHaveAttribute("data-habit", "Meditation");

  // Delete "Read" (checked on day 1): archived, past day stays 89%
  await page.getByRole("button", { name: "Delete Read" }).click();
  await page.getByTestId("confirm-sheet").getByText("Past days keep their percentages").waitFor();
  await page.getByTestId("confirm-yes").click();
  await expect(page.locator('[data-habit="Read"]')).toHaveCount(0);
  let state = await readState(page);
  const read = state.habits.find((h) => h.name === "Read")!;
  expect(read.archivedAt).toBe(today);
  await page.goto("#/calendar");
  await expect(page.locator(`[data-date="${d0}"]`)).toHaveAttribute("aria-label", `${d0}, 89%`);

  // Scoring sheet
  await page.goto("#/settings");
  await page.getByRole("button", { name: "How scoring works" }).click();
  await expect(page.getByTestId("scoring-sheet")).toContainText("80%");
  await page.screenshot({ path: `${SHOTS}/settings-scoring.png` });
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("scoring-sheet")).toHaveCount(0);

  // Reset
  await page.getByRole("button", { name: "Reset arc" }).click();
  await page.getByTestId("confirm-yes").click();
  state = await readState(page);
  expect(state.settings.startDate).toBe(today);
  expect(Object.keys(state.logs)).toHaveLength(0);
  expect(state.habits.some((h) => h.name === "Read")).toBe(false); // archived habit dropped
  expect(state.habits).toHaveLength(8);
});

test("settings: start date moves default habits; number fields commit on blur; export downloads JSON", async ({ page }) => {
  const today = todayLocal();
  await page.goto("#/settings");
  const newStart = addDays(today, -10);
  await page.getByLabel("Arc start date").fill(newStart);
  await expect.poll(async () => (await readState(page)).settings.startDate).toBe(newStart);
  let state = await readState(page);
  expect(state.habits.every((h) => h.createdAt === newStart)).toBe(true);

  const len = page.getByLabel("Arc length in days");
  await len.fill("");
  await len.fill("60");
  await len.blur();
  await expect.poll(async () => (await readState(page)).settings.lengthDays).toBe(60);
  const sleep = page.getByLabel("Sleep target hours");
  await sleep.fill("0.5");
  await sleep.blur();
  await expect.poll(async () => (await readState(page)).settings.sleepTargetHours).toBe(0.5);

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export JSON" }).click()]);
  expect(download.suggestedFilename()).toBe(`winter-arc-${today}.json`);
  const text = await (await download.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString("utf8"));
  state = JSON.parse(text);
  expect(state.settings.lengthDays).toBe(60);
  expect(state.habits).toHaveLength(9);
});

test("settings: import rejects a bad file and replaces on confirm", async ({ page }) => {
  await page.goto("#/settings");
  await page.getByTestId("import-file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{nope") });
  await expect(page.getByTestId("import-error")).toContainText("not valid JSON");
  await page.screenshot({ path: `${SHOTS}/settings-import-error.png`, fullPage: true });

  await page.getByTestId("import-file").setInputFiles({ name: "shape.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ version: 1, habits: 3 })) });
  await expect(page.getByTestId("import-error")).toBeVisible();

  const good = defaultState(addDays(todayLocal(), -1));
  good.habits = good.habits.slice(0, 2);
  await page.getByTestId("import-file").setInputFiles({ name: "good.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(good)) });
  await expect(page.getByTestId("confirm-sheet")).toContainText("2 habits");
  await page.getByTestId("confirm-yes").click();
  await expect(page.getByTestId("settings-habits").locator("li")).toHaveCount(2);
  const stored = await page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY);
  expect(JSON.parse(stored!).habits).toHaveLength(2);
});
