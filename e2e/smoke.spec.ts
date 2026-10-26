import { expect, test } from "@playwright/test";
import { readState } from "./helpers";

test("a fresh install shows the Grove shell, four tabs and an empty garden", async ({ page }) => {
  await page.goto("#/");
  await expect(page).toHaveTitle("Grove");
  await expect(page.getByTestId("empty-garden")).toHaveText("Start your first arc to plant a garden.");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveText(["Garden", "Progress", "Arcs", "Settings"]);
  for (const name of ["Progress", "Arcs", "Settings"]) {
    await nav.getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  }
  // The empty state is persisted as v3 with no sample data.
  const s = await readState(page);
  expect(s.version).toBe(3);
  expect(s.arcs).toEqual([]);
  expect(s.habits).toEqual([]);
});

test("the manifest is Grove", async ({ request }) => {
  const res = await request.get("manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBe("Grove");
  expect(m.short_name).toBe("Grove");
});
