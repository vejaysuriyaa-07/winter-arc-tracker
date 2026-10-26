// SPEC section 10, step 8: fresh state, check all habits, wave hits 100% and
// turns gold, reload, still 100%, calendar today cell has a gold ring,
// insights consistency matches.
import { expect, test } from "@playwright/test";
import { readState } from "./helpers";

test("smoke: a full first day", async ({ page }) => {
  await page.goto("#/");
  const rows = page.getByTestId("habit-row");
  await expect(rows).toHaveCount(9);
  await expect(page.getByTestId("percent")).toHaveText("0%");
  await expect(page.getByTestId("wave")).toHaveAttribute("data-gold", "false");

  for (let i = 0; i < 9; i++) await rows.nth(i).click();
  await expect(page.getByTestId("percent")).toHaveText("100%");
  await expect(page.getByTestId("wave")).toHaveAttribute("data-percent", "100");
  await expect(page.getByTestId("wave")).toHaveAttribute("data-gold", "true");
  await expect(page.getByTestId("streak")).toHaveText("1");

  await page.reload();
  await expect(page.getByTestId("percent")).toHaveText("100%");
  await expect(page.getByTestId("wave")).toHaveAttribute("data-gold", "true");
  for (let i = 0; i < 9; i++) await expect(rows.nth(i)).toHaveAttribute("aria-checked", "true");

  // The browser's own day, read from what it stored, so a runner in another zone can't disagree.
  const state = await readState(page);
  const today = Object.keys(state.logs)[0]!;
  expect(state.logs[today]!.completedHabitIds).toHaveLength(9);

  await page.getByRole("link", { name: "Calendar" }).click();
  const cell = page.locator(`[data-date="${today}"]`);
  await expect(cell).toHaveAttribute("data-bucket", "full");
  await expect(cell).toHaveClass(/border-gold/);

  await page.getByRole("link", { name: "Insights" }).click();
  await expect(page.getByTestId("insights-consistency")).toHaveText("100%");
  await expect(page.getByTestId("insights-current-streak")).toHaveText("1");
});
