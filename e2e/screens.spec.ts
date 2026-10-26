// Screenshots of every screen at phone width, for visual review during the build.
import { expect, test } from "@playwright/test";
import { SHOTS, defaultState, seed, todayLocal } from "./helpers";
import { addDays } from "../src/lib/dates";

test.describe("screens", () => {
  test("today: fresh arc", async ({ page }) => {
    await page.goto("#/");
    await page.getByTestId("habit-row").first().waitFor();
    await page.screenshot({ path: `${SHOTS}/today-fresh.png`, fullPage: true });
  });

  test("today: half done", async ({ page }) => {
    await page.goto("#/");
    const rows = page.getByTestId("habit-row");
    for (let i = 0; i < 4; i++) await rows.nth(i).click();
    await expect(page.getByTestId("wave")).toHaveAttribute("data-percent", "44");
    await page.screenshot({ path: `${SHOTS}/today-half.png`, fullPage: true });
  });

  test("today: all done", async ({ page }) => {
    await page.goto("#/");
    const rows = page.getByTestId("habit-row");
    const n = await rows.count();
    for (let i = 0; i < n; i++) await rows.nth(i).click();
    await expect(page.getByTestId("wave")).toHaveAttribute("data-gold", "true");
    await page.screenshot({ path: `${SHOTS}/today-full.png`, fullPage: true });
  });

  test("today: before the arc starts", async ({ page }) => {
    const s = defaultState(todayLocal());
    s.settings.startDate = addDays(todayLocal(), 5);
    s.habits = s.habits.map((h) => ({ ...h, createdAt: s.settings.startDate }));
    await seed(page, s);
    await page.goto("#/");
    await page.getByTestId("arc-before").waitFor();
    await page.screenshot({ path: `${SHOTS}/today-before.png`, fullPage: true });
  });

  test("today: arc complete", async ({ page }) => {
    const today = todayLocal();
    const s = defaultState(addDays(today, -20));
    s.settings.lengthDays = 14;
    for (let i = 0; i < 14; i++) {
      const d = addDays(s.settings.startDate, i);
      s.logs[d] = { date: d, completedHabitIds: s.habits.slice(0, i % 2 === 0 ? 9 : 7).map((h) => h.id) };
    }
    await seed(page, s);
    await page.goto("#/");
    await page.getByTestId("arc-complete").waitFor();
    await page.screenshot({ path: `${SHOTS}/today-complete.png`, fullPage: true });
  });

  for (const route of ["calendar", "insights", "goals", "settings"]) {
    test(`${route}: fresh arc`, async ({ page }) => {
      await page.goto(`#/${route}`);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `${SHOTS}/${route}-fresh.png`, fullPage: true });
    });
  }
});
