// SPEC 4.1: an app left open overnight shows the new day (re-read once a minute).
import { expect, test } from "@playwright/test";
import { formatShort } from "../src/lib/dates";
import { readState } from "./helpers";

test("today rolls over at midnight without a reload", async ({ page }) => {
  // 23:59 in America/Los_Angeles (PST, DST ended Nov 1 2026). An explicit offset keeps this
  // right whatever zone the test runner itself is in.
  await page.clock.install({ time: "2026-11-03T23:59:00-08:00" });
  await page.goto("#/");
  await expect(page.getByTestId("habit-row").first()).toBeVisible();
  await expect(page.locator("header")).toContainText(formatShort("2026-11-03"));
  await expect(page.getByTestId("day-pill")).toHaveText("Day 1 / 90");

  await page.getByTestId("habit-row").nth(0).click();
  await expect(page.getByTestId("percent")).toHaveText("11%");

  await page.clock.runFor(2 * 60 * 1000); // past midnight, past the minute poll
  await expect(page.locator("header")).toContainText(formatShort("2026-11-04"));
  await expect(page.getByTestId("day-pill")).toHaveText("Day 2 / 90");
  await expect(page.getByTestId("percent")).toHaveText("0%"); // the new day starts empty
  await expect(page.getByTestId("habit-row").nth(0)).toHaveAttribute("aria-checked", "false");
  // Yesterday's log is intact and no log was created for the new day: it is a rollover, not a reset.
  const state = await readState(page);
  expect(state.logs["2026-11-03"]!.completedHabitIds).toHaveLength(1);
  expect(state.logs["2026-11-04"]).toBeUndefined();
});
