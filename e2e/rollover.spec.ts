// An app left open overnight shows the new day (re-read once a minute).
import { expect, test } from "@playwright/test";
import { readState, seed, stateWithArc } from "./helpers";

test("today rolls over at midnight without a reload", async ({ page }) => {
  // 23:59 in America/Los_Angeles (PST, DST ended Nov 1 2026). The explicit offset keeps this
  // right whatever zone the runner itself is in.
  await page.clock.install({ time: "2026-11-03T23:59:00-08:00" });
  await seed(page, stateWithArc({ startDate: "2026-11-03" }));
  await page.goto("#/");
  await expect(page.getByTestId("weekday")).toHaveText("Tuesday");
  await page.getByTestId("habit-row").first().click();
  await expect(page.getByTestId("count")).toHaveText("1 of 3");
  // Jump past midnight and the minute poll. fastForward fires due timers once instead of
  // stepping every animation frame for two minutes.
  await page.clock.fastForward(2 * 60 * 1000);
  await expect(page.getByTestId("weekday")).toHaveText("Wednesday");
  await expect(page.getByTestId("date")).toHaveText("November 4");
  await expect(page.getByTestId("count")).toHaveText("0 of 3"); // the new day starts empty
  // Yesterday's check-off is intact: a rollover, not a reset.
  const s = await readState(page);
  expect(Object.values(s.logs).find((l) => l.date === "2026-11-03")!.completedHabitIds).toHaveLength(1);
});
