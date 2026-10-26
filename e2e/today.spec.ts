import { expect, test } from "@playwright/test";
import { readState } from "./helpers";

test("check-offs move the wave live and survive a reload", async ({ page }) => {
  await page.goto("#/");
  const rows = page.getByTestId("habit-row");
  await expect(rows).toHaveCount(9);
  await expect(page.getByTestId("consistency-empty")).toBeVisible();

  await rows.nth(0).click();
  await expect(rows.nth(0)).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("percent")).toHaveText("11%");
  await expect(page.getByTestId("wave")).toHaveAttribute("data-percent", "11");
  await expect(page.getByTestId("consistency")).toHaveText("11%");

  const state = await readState(page);
  const today = Object.keys(state.logs)[0]!;
  expect(state.logs[today]!.completedHabitIds).toEqual([state.habits[0]!.id]);

  await page.reload();
  await expect(page.getByTestId("habit-row").nth(0)).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("percent")).toHaveText("11%");

  // Uncheck lowers it again.
  await page.getByTestId("habit-row").nth(0).click();
  await expect(page.getByTestId("percent")).toHaveText("0%");
});

test("quick add schedules a habit from today and the check-in persists", async ({ page }) => {
  await page.goto("#/");
  await page.getByLabel("New habit name").fill("Stretch");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByTestId("habit-row")).toHaveCount(10);
  await expect(page.getByTestId("habit-row").nth(9)).toHaveAttribute("data-habit", "Stretch");

  await page.getByRole("radio", { name: "Good" }).click();
  await page.getByLabel("Sleep hrs").fill("7.5");
  await page.getByRole("radio", { name: "Quality 4" }).click();
  await page.getByLabel("One win today:").fill("Ran 5k");
  await page.getByLabel("One win today:").blur();

  await page.reload();
  await expect(page.getByRole("radio", { name: "Good" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Sleep hrs")).toHaveValue("7.5");
  await expect(page.getByRole("radio", { name: "Quality 4" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("One win today:")).toHaveValue("Ran 5k");
});
