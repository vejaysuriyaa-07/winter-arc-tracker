import { expect, test } from "@playwright/test";
import { seed, stateWithArc } from "./helpers";

const BANNER = "Couldn't save your last change. Export a backup in Settings.";

test("a refused save shows a persistent banner on every screen until the next save works", async ({ page }) => {
  await seed(page, stateWithArc({ startDate: "2026-10-01" }));
  await page.addInitScript(() => {
    const w = window as unknown as { __realSetItem?: typeof Storage.prototype.setItem };
    w.__realSetItem = Storage.prototype.setItem;
    // Registered after seed(), so the seed write has already landed; every app write is refused.
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page.goto("#/");
  await page.getByTestId("habit-row").first().click();
  // The tap still applied on screen even though storage refused it.
  await expect(page.getByTestId("habit-row").first()).toHaveAttribute("aria-checked", "true");
  // That write was refused.
  await expect(page.getByTestId("save-banner")).toHaveText(BANNER);
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const name of ["Progress", "Arcs", "Settings", "Garden"]) {
    await nav.getByRole("link", { name }).click();
    await expect(page.getByTestId("save-banner")).toBeVisible();
  }
  // Storage recovers: the next change saves and the banner clears.
  await page.evaluate(() => {
    const w = window as unknown as { __realSetItem?: typeof Storage.prototype.setItem };
    Storage.prototype.setItem = w.__realSetItem!;
  });
  await page.getByTestId("habit-row").nth(1).click();
  await expect(page.getByTestId("save-banner")).toHaveCount(0);
});
