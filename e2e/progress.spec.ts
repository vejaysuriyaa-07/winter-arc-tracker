// Phase 4: Progress (this arc, all time), Month view with backfill, Plant detail.
import { expect, test, type Page } from "@playwright/test";
import { SHOTS, noonLA, readState, seed, stateWithArc, withLogs, withArcId } from "./helpers";
import type { AppState, Look, Season } from "../src/types";

const TODAY = "2026-10-26"; // day 26 of a 90-day arc from Oct 1

// Hand-worked state. Habits Read, Gym, Meditation, all from Oct 1.
//   Read: every day except Oct 3 and 4.       -> 24 of 26 days (today included)
//   Gym: even days except Oct 4 (2..24).       -> 11 days
//   Meditation: Oct 20..25.                    -> 6 days
//   Oct 3: no log at all (not logged). Oct 4: a log with only a mood (0%, missed).
//   Scheduled 3 x 26 = 78, done 24 + 11 + 6 = 41 -> arc score 52.6% -> "53%".
//   Full (3 of 3) days: 20, 22, 24 -> kept 3 of 26. Chain 0 (today 1/3, 25th 2/3), best 1.
//   Last 7 (20..26): 100, 66.7, 100, 66.7, 100, 66.7, 33.3 = 533.3 / 7 = 76.2 -> "76%".
//   The 7 before (13..19): 33.3, 66.7, 33.3, 66.7, 33.3, 66.7, 33.3 = 333.3 / 7 = 47.6; change +28.6 -> "+29".
function progressState(look: Look = "journal", season: Season = "winter"): AppState {
  const days: Record<string, string[]> = {};
  for (let d = 1; d <= 26; d++) {
    if (d === 3 || d === 4) continue;
    const ds = `2026-10-${String(d).padStart(2, "0")}`;
    const done = ["Read"];
    if (d % 2 === 0 && d <= 24) done.push("Gym");
    if (d >= 20 && d <= 25) done.push("Meditation");
    days[ds] = done;
  }
  days["2026-10-04"] = [];
  // A fixed arc id: the rare visitor's roll is seeded by it, and this id never rolls one on these days.
  return withArcId(withLogs(stateWithArc({ startDate: "2026-10-01", look, season }), days, { "2026-10-04": "okay" }), "0a0a0a0a-0000-4000-8000-00000000f001");
}

async function openAt(page: Page, state: AppState, path: string): Promise<void> {
  await page.clock.setFixedTime(noonLA(TODAY));
  await seed(page, state);
  await page.goto(path);
}

test("this arc: tiles, plants and week match the hand-worked numbers", async ({ page }) => {
  await openAt(page, progressState(), "#/progress");
  await expect(page.getByTestId("tile-kept")).toHaveText("3");
  await expect(page.getByText("of 26").first()).toBeVisible();
  await expect(page.getByTestId("tile-score")).toHaveText("53%");
  await expect(page.getByTestId("tile-chain")).toHaveText("0");
  await expect(page.getByTestId("tile-best")).toHaveText("1");
  await expect(page.getByTestId("plant-row")).toHaveCount(3);
  await expect(page.getByTestId("plant-row").nth(0)).toContainText("Read");
  await expect(page.getByTestId("plant-days").nth(0)).toHaveText("24 of 26 days");
  await expect(page.getByTestId("plant-days").nth(1)).toHaveText("11 of 26 days");
  await expect(page.getByTestId("plant-days").nth(2)).toHaveText("6 of 26 days");
  await expect(page.locator('[data-testid="week-bar"][data-weak="true"]')).toHaveCount(1);
  await expect(page.getByTestId("week-line")).toContainText("are your dry spot");
  await expect(page.getByTestId("visitors-link")).toContainText("0 of 9 found");
});

test("the timelapse re-renders the garden at each day", async ({ page }) => {
  await openAt(page, progressState(), "#/progress");
  const lapse = page.getByTestId("timelapse");
  await expect(page.getByTestId("timelapse-label")).toHaveText("Today");
  await expect(page.getByTestId("timelapse-slider")).toHaveAttribute("max", "26");
  const flowersToday = Number(await lapse.getAttribute("data-flowers"));
  expect(flowersToday).toBe(5 + 3); // wildflowers + 3 kept days
  await page.getByTestId("timelapse-slider").fill("1");
  await expect(page.getByTestId("timelapse-label")).toHaveText("Oct 1");
  await expect(lapse).toHaveAttribute("data-flowers", "5");
  const readId = (await readState(page)).habits.find((h) => h.name === "Read")!.id;
  await expect(lapse.locator(`[data-testid="plant"][data-id="${readId}"]`)).toHaveAttribute("data-g", (1 / 70).toFixed(3)); // Read, done on day 1
  await page.getByTestId("timelapse-play").click();
  await expect(page.getByTestId("timelapse-label")).toHaveText("Today", { timeout: 10_000 });
  await expect(lapse).toHaveAttribute("data-flowers", "8");
});

test("month view: buckets, the last 7 days, and backfill with an edit toggle", async ({ page }) => {
  await openAt(page, progressState(), "#/progress");
  await page.getByTestId("month-link").click();
  await expect(page.getByTestId("month-title")).toHaveText("October 2026");
  const cell = (d: string) => page.locator(`[data-testid="month-cell"][data-date="2026-10-${d}"]`);
  await expect(cell("20")).toHaveAttribute("data-bucket", "full");
  await expect(cell("21")).toHaveAttribute("data-bucket", "some");
  await expect(cell("03")).toHaveAttribute("data-bucket", "unlogged");
  await expect(cell("04")).toHaveAttribute("data-bucket", "zero");
  await expect(cell("27")).toHaveAttribute("data-bucket", "future");
  await expect(cell("27")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Previous month" })).toBeDisabled();
  await expect(page.getByTestId("last7-score")).toHaveText("76%");
  await expect(page.getByTestId("last7-change")).toHaveText("+29 vs the week before");
  await expect(page.getByTestId("last7-full")).toHaveText("3 of 7");
  await page.screenshot({ path: `${SHOTS}/p4-month-journal-winter.png`, fullPage: false });

  await cell("25").click();
  const sheet = page.getByTestId("day-sheet");
  const gym = sheet.getByTestId("day-habit").filter({ hasText: "Gym" });
  await expect(gym).toHaveAttribute("aria-checked", "false");
  await gym.click({ force: true }); // read-only until Edit
  await expect(gym).toHaveAttribute("aria-checked", "false");
  await sheet.getByTestId("day-edit").click();
  await gym.click();
  await expect(gym).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(cell("25")).toHaveAttribute("data-bucket", "full");
  const s = await readState(page);
  const gymId = s.habits.find((h) => h.name === "Gym")!.id;
  expect(Object.values(s.logs).find((l) => l.date === "2026-10-25")!.completedHabitIds).toContain(gymId);
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByTestId("month-title")).toHaveText("November 2026");
});

test("plant detail: numbers, day grid, edit and remove", async ({ page }) => {
  await openAt(page, progressState(), "#/progress");
  await page.getByTestId("plant-row").filter({ hasText: "Gym" }).click();
  await expect(page.getByTestId("plant-name")).toHaveText("Gym");
  await expect(page.getByTestId("plant-done")).toHaveText("11");
  await expect(page.getByTestId("plant-planted")).toHaveText("Oct 1");
  await expect(page.getByTestId("plant-day")).toHaveCount(26);
  await expect(page.locator('[data-testid="plant-day"][data-status="done"]')).toHaveCount(11);
  await expect(page.locator('[data-testid="plant-day"][data-status="today"]')).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/p4-plant-journal-winter.png` });

  await page.getByRole("button", { name: "Edit habit" }).click();
  await page.getByLabel("Habit name").fill("Gym session");
  await page.getByLabel("Habit detail").fill("45 min");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("plant-name")).toHaveText("Gym session");

  await page.getByTestId("remove-plant").click();
  await expect(page.getByText("Removed from this arc")).toBeVisible();
  await page.getByTestId("restore-habit").click();
  await expect(page.getByTestId("remove-plant")).toBeVisible();
});

test("a finished arc is read-only in the Month view and Plant detail", async ({ page }) => {
  const s = withLogs(stateWithArc({ startDate: "2026-09-01", lengthDays: 20 }), { "2026-09-05": ["Read"] });
  const arcId = s.arcs[0]!.id;
  s.ui.celebrated[`arc:${arcId}`] = true;
  await openAt(page, s, "#/month");
  await page.getByRole("button", { name: "Previous month" }).isVisible();
  await expect(page.getByTestId("month-title")).toHaveText("September 2026");
  await page.locator('[data-testid="month-cell"][data-date="2026-09-05"]').click();
  await expect(page.getByTestId("day-sheet")).toBeVisible();
  await expect(page.getByTestId("day-edit")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto(`#/plant/${s.habits[0]!.id}`);
  await expect(page.getByTestId("plant-name")).toHaveText("Read");
  await expect(page.getByRole("button", { name: "Edit habit" })).toHaveCount(0);
  await expect(page.getByTestId("remove-plant")).toHaveCount(0);
});

test("a removal is undone the same day only", async ({ page }) => {
  await openAt(page, progressState(), "#/progress");
  await page.getByTestId("plant-row").filter({ hasText: "Gym" }).click();
  await page.getByTestId("remove-plant").click();
  await expect(page.getByTestId("restore-habit")).toBeVisible();
  // A habit removed on an earlier day shows no undo.
  const s = progressState();
  const gym = s.habits.find((h) => h.name === "Gym")!;
  gym.archivedAt = "2026-10-20";
  await page.evaluate(() => localStorage.clear());
  await page.context().clearCookies();
  const p2 = await page.context().newPage();
  await p2.clock.setFixedTime(noonLA(TODAY));
  await p2.addInitScript(([k, v]) => localStorage.setItem(k as string, v as string), ["grove:v3", JSON.stringify(s)]);
  await p2.goto(`#/plant/${gym.id}`);
  await expect(p2.getByText("Removed from this arc")).toBeVisible();
  await expect(p2.getByTestId("restore-habit")).toHaveCount(0);
});

test("Close on a deep-linked plant stays in the app", async ({ page }) => {
  const s = progressState();
  await openAt(page, s, `#/plant/${s.habits[0]!.id}`);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/#\/progress/);
});

test("with many plants each tap opens the plant under the finger", async ({ page }) => {
  let s = stateWithArc({ startDate: "2026-10-01", habits: Array.from({ length: 12 }, (_, i) => ({ name: `Habit ${i + 1}` })) });
  s = withLogs(s, { "2026-10-25": s.habits.map((h) => h.name) });
  await openAt(page, s, "#/");
  const taps = page.getByTestId("plant-tap");
  await expect(taps).toHaveCount(12);
  const boxes = await taps.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.left, r.right]));
  for (let i = 1; i < boxes.length; i++) expect(boxes[i]![0]!).toBeGreaterThanOrEqual(boxes[i - 1]![1]! - 0.5); // no overlap
  await taps.nth(5).click();
  await expect(page.getByTestId("plant-name")).toHaveText("Habit 6");
});

test("a new screen opens at the top", async ({ page }) => {
  await openAt(page, progressState(), "#/progress");
  await page.getByTestId("plant-row").first().scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await page.getByTestId("plant-row").first().click();
  await expect(page.getByTestId("plant-name")).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("tapping a plant in the garden opens it", async ({ page }) => {
  await openAt(page, progressState(), "#/");
  await page.getByRole("button", { name: "Open Meditation" }).click();
  await expect(page.getByTestId("plant-name")).toHaveText("Meditation");
});

test("all time: rings, lifetime counts, grove and tallest trees", async ({ page }) => {
  await openAt(page, progressState(), "#/progress?view=all");
  await expect(page.getByTestId("ring")).toHaveCount(1);
  await page.getByTestId("ring-button").first().click();
  // October: 3 kept of 26 scored days = 11.5% -> 12%
  await expect(page.getByTestId("ring-detail")).toHaveText("October 2026: 12% of days kept");
  await expect(page.getByTestId("life-flowers")).toHaveText("3");
  await expect(page.getByTestId("life-checkoffs")).toHaveText("41");
  await expect(page.getByTestId("life-days")).toHaveText("24"); // days with a check-off: 1, 2, 5..26
  await expect(page.getByTestId("life-streak")).toHaveText("1");
  await expect(page.getByTestId("life-arcs")).toHaveText("0");
  await expect(page.getByTestId("grove-plot")).toHaveCount(1);
  await expect(page.getByTestId("tall-tree")).toHaveText(["Read24 days", "Gym11 days", "Meditation6 days"]);
});

const LOOKS: Look[] = ["journal", "greenhouse", "night"];
const SEASONS: Season[] = ["spring", "autumn"];
for (const look of LOOKS) {
  for (const season of SEASONS) {
    test(`phase 4 screenshots: ${look}, ${season}`, async ({ page }) => {
      await openAt(page, progressState(look, season), "#/progress");
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${SHOTS}/p4-progress-${look}-${season}-top.png` });
      await page.getByTestId("plant-row").first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOTS}/p4-progress-${look}-${season}-plants.png` });
      await page.goto("#/progress?view=all");
      await page.screenshot({ path: `${SHOTS}/p4-alltime-${look}-${season}.png` });
      await page.goto("#/month");
      await page.screenshot({ path: `${SHOTS}/p4-month-${look}-${season}.png` });
      const s = await readState(page);
      await page.goto(`#/plant/${s.habits[0]!.id}`);
      await page.screenshot({ path: `${SHOTS}/p4-plant-${look}-${season}.png` });
    });
  }
}
