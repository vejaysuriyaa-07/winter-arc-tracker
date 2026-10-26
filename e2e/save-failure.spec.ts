import { expect, test } from "@playwright/test";

const BANNER = "Couldn't save your last change. Export a backup in Settings.";

test("a refused save shows a persistent banner on every screen", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page.goto("#/");
  // The first write after load is refused.
  await expect(page.getByTestId("save-banner")).toHaveText(BANNER);
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const name of ["Progress", "Arcs", "Settings", "Garden"]) {
    await nav.getByRole("link", { name }).click();
    await expect(page.getByTestId("save-banner")).toBeVisible();
  }
});
