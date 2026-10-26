// An app left open overnight shows the new day (re-read once a minute).
import { expect, test } from "@playwright/test";
import { seed, stateWithArc } from "./helpers";

test("today rolls over at midnight without a reload", async ({ page }) => {
  // 23:59 in America/Los_Angeles (PST, DST ended Nov 1 2026). The explicit offset keeps this
  // right whatever zone the runner itself is in.
  await page.clock.install({ time: "2026-11-03T23:59:00-08:00" });
  await seed(page, stateWithArc({ startDate: "2026-11-03" }));
  await page.goto("#/");
  await expect(page.getByTestId("arc-day")).toHaveText("Day 1 of 90");
  await page.clock.runFor(2 * 60 * 1000); // past midnight, past the minute poll
  await expect(page.getByTestId("arc-day")).toHaveText("Day 2 of 90");
});
