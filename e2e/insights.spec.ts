import { expect, test } from "@playwright/test";
import { SHOTS, defaultState, seed, todayLocal } from "./helpers";
import { addDays } from "../src/lib/dates";

test("insights: empty states on a fresh arc", async ({ page }) => {
  await page.goto("#/insights");
  await expect(page.getByTestId("card-consistency").getByTestId("empty-state")).toBeVisible();
  await expect(page.getByTestId("card-streaks").getByTestId("empty-state")).toBeVisible();
  await expect(page.getByTestId("card-sleep").getByTestId("empty-state")).toBeVisible();
  await expect(page.getByTestId("card-leaderboard").getByTestId("empty-state")).toBeVisible();
  await expect(page.getByTestId("card-wave").getByTestId("empty-state")).toBeVisible();
  await expect(page.getByTestId("card-weekdays").getByTestId("empty-state")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/insights-fresh.png`, fullPage: true });
});

test("insights: with data", async ({ page }) => {
  const today = todayLocal();
  const s = defaultState(addDays(today, -12));
  const pattern = [9, 7, 9, 0, 5, 9, 8, 9, 3, 9, 9, 6];
  for (let i = 0; i < 12; i++) {
    const d = addDays(s.settings.startDate, i);
    if (i === 4) continue;
    s.logs[d] = {
      date: d,
      completedHabitIds: s.habits.slice(0, pattern[i]).map((h) => h.id),
      sleepHours: 6 + (i % 3),
      sleepQuality: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
    };
  }
  await seed(page, s);
  await page.goto("#/insights");
  // Hand-computed: 13 arc days so far, completed 9+7+9+0+0+9+8+9+3+9+9+6+0 = 78 of 13*9 = 117 -> 67%.
  await expect(page.getByTestId("insights-consistency")).toHaveText("67%");
  const rows = page.getByTestId("leaderboard").locator("li");
  await expect(rows).toHaveCount(9);
  // The first three habits all have 10 / 13 days: tie broken alphabetically.
  await expect(rows.nth(0)).toHaveAttribute("data-habit", "Gym");
  await expect(rows.nth(1)).toHaveAttribute("data-habit", "Meditation");
  await expect(rows.nth(2)).toHaveAttribute("data-habit", "Wake up at 5 AM");
  await expect(rows.nth(8)).toHaveAttribute("data-habit", "No social media"); // 6 / 13
  await expect(rows.nth(8)).toContainText("46%");
  await expect(page.locator("[data-weakest=true]")).toHaveCount(1);

  // 7-day window shows 7 markers; the line draws itself to offset 0.
  await expect(page.getByTestId("marker")).toHaveCount(7);
  const line = page.getByTestId("wave-chart").locator("path[stroke]");
  await expect.poll(() => line.evaluate((el) => getComputedStyle(el).strokeDashoffset)).toBe("0px");
  await page.screenshot({ path: `${SHOTS}/insights-data.png`, fullPage: true });

  // All-time: the unlogged day is hollow and the tooltip says so on hover.
  await page.getByRole("button", { name: "All" }).click();
  await expect(page.getByTestId("marker")).toHaveCount(13);
  const unlogged = page.locator(`[data-testid="marker"][data-date="${addDays(s.settings.startDate, 4)}"]`);
  await expect(unlogged).toHaveAttribute("data-kind", "unlogged");
  const box = (await unlogged.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId("chart-tooltip")).toContainText("not logged");
  const todayMarker = page.locator(`[data-testid="marker"][data-date="${today}"]`);
  await expect(todayMarker).toHaveAttribute("data-kind", "today");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("insights: the line is drawn at once", async ({ page }) => {
    const today = todayLocal();
    const s = defaultState(addDays(today, -3));
    for (let i = 0; i < 3; i++) {
      const d = addDays(s.settings.startDate, i);
      s.logs[d] = { date: d, completedHabitIds: s.habits.slice(0, 5).map((h) => h.id) };
    }
    await seed(page, s);
    await page.goto("#/insights");
    const line = page.getByTestId("wave-chart").locator("path[stroke]");
    await expect(line).toBeVisible();
    expect(await line.evaluate((el) => el.style.strokeDashoffset)).toBe("0");
    expect(await line.evaluate((el) => el.style.strokeDasharray)).toBe("");
  });
});
