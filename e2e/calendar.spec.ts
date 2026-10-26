import { expect, test } from "@playwright/test";
import { SHOTS, defaultState, seed, todayLocal } from "./helpers";
import { addDays } from "../src/lib/dates";

test.describe("calendar with data", () => {
  test("calendar: month with logs and open day sheet", async ({ page }) => {
    const today = todayLocal();
    const s = defaultState(addDays(today, -12));
    const pattern = [9, 7, 9, 0, 5, 9, 8, 9, 3, 9, 9, 6];
    for (let i = 0; i < 12; i++) {
      const d = addDays(s.settings.startDate, i);
      if (i === 4) continue; // one unlogged day
      s.logs[d] = {
        date: d,
        completedHabitIds: s.habits.slice(0, pattern[i]).map((h) => h.id),
        mood: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      };
    }
    await seed(page, s);
    await page.goto("#/calendar");
    await page.getByTestId("day-cell").first().waitFor();
    const cell = (d: string) => page.locator(`[data-date="${d}"]`);
    await expect(cell(addDays(s.settings.startDate, 4))).toHaveAttribute("data-bucket", "unlogged");
    await expect(cell(addDays(s.settings.startDate, 3))).toHaveAttribute("data-bucket", "zero");
    await expect(cell(addDays(s.settings.startDate, 1))).toHaveAttribute("data-bucket", "mid"); // 7/9 = 78%
    await expect(cell(addDays(s.settings.startDate, 6))).toHaveAttribute("data-bucket", "high"); // 8/9 = 89%
    await expect(cell(addDays(today, -3))).toHaveAttribute("data-bucket", "full");
    await expect(cell(addDays(s.settings.startDate, -1))).toHaveAttribute("data-state", "outside");
    await expect(cell(addDays(today, 1))).toHaveAttribute("data-state", "future");
    await expect(page.getByTestId("month-average")).toContainText("%");
    await expect(page.getByTestId("week-average").filter({ hasText: "%" }).first()).toBeVisible();
    await expect(page.getByTestId("mood-strip")).toContainText("🤩");
    // Arc of 90 days from 12 days ago spans this month and the next two; prev is disabled at the first month.
    await expect(page.getByRole("button", { name: "Previous month" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Next month" })).toBeEnabled();
    await page.screenshot({ path: `${SHOTS}/calendar-data.png`, fullPage: true });
    await page.locator(`[data-date="${addDays(today, -3)}"]`).click();
    await page.getByTestId("day-sheet").waitFor();
    await expect(page.getByTestId("day-sheet-summary")).toHaveText("9 of 9 done, 100%");
    // Past day: read-only until Edit.
    await expect(page.getByTestId("sheet-habit").first()).toBeDisabled();
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByTestId("sheet-habit").first()).toBeEnabled();
    await page.screenshot({ path: `${SHOTS}/calendar-sheet.png` });
  });
});
