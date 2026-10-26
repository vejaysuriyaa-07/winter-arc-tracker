import { expect, test } from "@playwright/test";
import { SHOTS } from "./helpers";

const BANNER = "Couldn't save your last change. Export a backup in Settings.";

test("a refused save shows a persistent banner on every screen until the next save works", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __realSetItem?: typeof Storage.prototype.setItem };
    w.__realSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page.goto("#/");
  await expect(page.getByTestId("save-banner")).toHaveCount(0);

  const rows = page.getByTestId("habit-row");
  await rows.nth(0).click();
  // The tap still applied on screen even though storage refused it.
  await expect(rows.nth(0)).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("percent")).toHaveText("11%");
  await expect(page.getByTestId("save-banner")).toHaveText(BANNER);
  await page.screenshot({ path: `${SHOTS}/today-save-failed.png` });

  await page.getByRole("link", { name: "Calendar" }).click();
  await expect(page.getByTestId("save-banner")).toBeVisible();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByTestId("save-banner")).toBeVisible();

  // Storage recovers: the next change saves and the banner clears.
  await page.evaluate(() => {
    const w = window as unknown as { __realSetItem?: typeof Storage.prototype.setItem };
    Storage.prototype.setItem = w.__realSetItem!;
  });
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page.getByTestId("save-banner")).toBeVisible();
  await page.getByTestId("habit-row").nth(1).click();
  await expect(page.getByTestId("save-banner")).toHaveCount(0);
  await expect(page.getByTestId("percent")).toHaveText("22%");
});
