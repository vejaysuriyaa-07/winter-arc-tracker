import { expect, test } from "@playwright/test";
import { SHOTS, defaultState, readState, seed, todayLocal } from "./helpers";
import { addDays } from "../src/lib/dates";

test("100%: gold wave, confetti canvas, pulse; no confetti on a reload", async ({ page }) => {
  await page.goto("#/");
  const rows = page.getByTestId("habit-row");
  const n = await rows.count();
  for (let i = 0; i < n; i++) await rows.nth(i).click();
  await expect(page.getByTestId("wave")).toHaveAttribute("data-gold", "true");
  await expect(page.getByTestId("percent")).toHaveText("100%");
  await expect(page.locator(".wave-splash")).toHaveCount(2); // both crest layers splashed
  await expect(page.locator(".pulse-once")).toHaveCount(1);
  // canvas-confetti mounts a canvas on the first burst
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/today-gold.png` });

  await page.reload();
  await expect(page.getByTestId("wave")).toHaveAttribute("data-gold", "true");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("canvas")).toHaveCount(0);
});

test("level-up toast fires on the live crossing and not again on reload", async ({ page }) => {
  const today = todayLocal();
  const s = defaultState(addDays(today, -6));
  // 49 lifetime check-offs: 5 full days (45) + 4 yesterday
  for (let i = 0; i < 5; i++) {
    const d = addDays(s.settings.startDate, i);
    s.logs[d] = { date: d, completedHabitIds: s.habits.map((h) => h.id) };
  }
  const y = addDays(today, -1);
  s.logs[y] = { date: y, completedHabitIds: s.habits.slice(0, 4).map((h) => h.id) };
  await seed(page, s);
  await page.goto("#/");
  await expect(page.getByTestId("level")).toHaveText("Level 1");
  await expect(page.getByTestId("toast")).toHaveCount(0);
  await page.getByTestId("habit-row").nth(0).click();
  await expect(page.getByTestId("level")).toHaveText("Level 2");
  await expect(page.getByTestId("toast")).toContainText("Level 2");
  await page.screenshot({ path: `${SHOTS}/today-levelup.png` });
  expect((await readState(page)).ui.lastCelebratedLevel).toBe(2);
  await page.reload();
  await expect(page.getByTestId("level")).toHaveText("Level 2");
  await expect(page.getByTestId("toast")).toHaveCount(0);
});

test("a stored level above lastCelebratedLevel syncs silently on load", async ({ page }) => {
  const today = todayLocal();
  const s = defaultState(addDays(today, -8));
  for (let i = 0; i < 7; i++) {
    const d = addDays(s.settings.startDate, i);
    s.logs[d] = { date: d, completedHabitIds: s.habits.map((h) => h.id) };
  }
  s.ui.lastCelebratedLevel = 1; // 63 check-offs = level 2, as after an import
  await seed(page, s);
  await page.goto("#/");
  await expect(page.getByTestId("level")).toHaveText("Level 2");
  await expect(page.getByTestId("toast")).toHaveCount(0);
  expect((await readState(page)).ui.lastCelebratedLevel).toBe(2);
});

test("importing a higher-level file never toasts", async ({ page }) => {
  const today = todayLocal();
  const s = defaultState(addDays(today, -8));
  for (let i = 0; i < 7; i++) {
    const d = addDays(s.settings.startDate, i);
    s.logs[d] = { date: d, completedHabitIds: s.habits.map((h) => h.id) };
  }
  s.ui.lastCelebratedLevel = 1; // 63 check-offs = level 2
  await page.goto("#/settings");
  await page.getByTestId("import-file").setInputFiles({ name: "l2.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(s)) });
  await page.getByTestId("confirm-yes").click();
  await page.getByRole("link", { name: "Today" }).click();
  await expect(page.getByTestId("level")).toHaveText("Level 2");
  await expect(page.getByTestId("toast")).toHaveCount(0);
  expect((await readState(page)).ui.lastCelebratedLevel).toBe(2);
});

test("pwa: manifest and service worker are served", async ({ page, request }) => {
  await page.goto("#/");
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBeTruthy();
  const manifest = await request.get(new URL(manifestHref!, page.url()).toString());
  expect(manifest.ok()).toBe(true);
  const json = await manifest.json();
  expect(json.display).toBe("standalone");
  expect(json.icons.length).toBeGreaterThanOrEqual(3);
  const sw = await request.get(new URL("sw.js", page.url()).toString());
  expect(sw.ok()).toBe(true);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r))).toBe(true);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("no drift, no splash, no confetti", async ({ page }) => {
    await page.goto("#/");
    const rows = page.getByTestId("habit-row");
    const n = await rows.count();
    for (let i = 0; i < n; i++) await rows.nth(i).click();
    await expect(page.getByTestId("wave")).toHaveAttribute("data-gold", "true");
    const drift = await page.locator(".wave-drift").first().evaluate((el) => getComputedStyle(el).animationName);
    expect(drift).toBe("none");
    await expect(page.locator(".wave-splash")).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
