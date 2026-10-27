// Phase 9: one person's first week, end to end, at 390x844 with a fake clock.
// New user, first arc, three days of check-offs, the first visitor, the Sunday
// recap, a second arc in another theme, switching back, export, reset, import.
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { SHOTS, readState } from "./helpers";
import type { AppState } from "../src/types";

/** Los Angeles wall time. Every day in this flow is in daylight time (UTC-7); summer time ends 1 Nov. */
const at = (day: string, hour: number, minute = 0): Date =>
  new Date(`${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-07:00`);

/** After a reload, wait until the garden has drawn its habits, so an absence check means something. */
async function reloaded(page: Page): Promise<void> {
  await page.reload();
  await expect(page.getByTestId("habit-row")).toHaveCount(3);
}

async function checkAll(page: Page): Promise<void> {
  const rows = page.getByTestId("habit-row");
  const n = await rows.count();
  for (let i = 0; i < n; i++) await rows.nth(i).click();
}

const html = (page: Page) => page.locator("html");

test("a first week in Grove, every main flow in order", async ({ page }) => {
  test.setTimeout(120_000);

  // Day 1, Wednesday 21 October: nothing yet, so the app says what to do first.
  await page.clock.setFixedTime(at("2026-10-21", 9));
  await page.goto("#/");
  await page.goto("#/arcs");
  await expect(page.getByTestId("no-arcs")).toBeVisible();
  await page.getByTestId("start-arc").click();
  await page.getByLabel("Arc name").fill("First Arc");
  await page.getByRole("radio", { name: "30 days" }).click();
  for (const h of ["Read", "Walk", "Stretch"]) {
    await page.getByLabel("Add a habit to this arc").fill(h);
    await page.getByLabel("Add a habit to this arc").press("Enter");
  }
  await page.getByTestId("plant-arc").click();
  await expect(page.getByTestId("arc-name")).toHaveText("First Arc");
  await expect(page.getByTestId("habit-row")).toHaveCount(3);

  // Mood and a full day: the full bloom plays, and only live.
  await page.getByRole("button", { name: "Great" }).click();
  await expect(page.getByTestId("garden")).toHaveAttribute("data-mood", "great");
  await checkAll(page);
  await expect(page.getByTestId("count")).toContainText("3 of 3");
  await expect(page.getByTestId("full-bloom")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/p9/flow-day1.png` });
  await reloaded(page);
  await expect(page.getByTestId("full-bloom")).toHaveCount(0);

  // Day 2 and day 3: three kept days in a row brings the first autumn visitor.
  await page.clock.setFixedTime(at("2026-10-22", 9));
  await reloaded(page);
  await checkAll(page);
  await page.clock.setFixedTime(at("2026-10-23", 9));
  await reloaded(page);
  await checkAll(page);
  await expect(page.getByText(/A Squirrel moved in/)).toBeVisible();
  await expect(page.getByTestId("garden-visitor")).toHaveAttribute("data-visitor", "autumn-squirrel");
  await page.screenshot({ path: `${SHOTS}/p9/flow-visitor.png` });
  await reloaded(page);
  await expect(page.getByText(/moved in/)).toHaveCount(0); // never again on load

  // Sunday 18:01: the recap for the week is ready.
  await page.clock.setFixedTime(at("2026-10-25", 18, 1));
  await reloaded(page);
  await page.getByTestId("recap-card").click();
  await expect(page.getByTestId("recap-slide")).toHaveAttribute("data-slide", "score");
  while ((await page.getByTestId("recap-next").innerText()) !== "Done") await page.getByTestId("recap-next").click();
  await page.screenshot({ path: `${SHOTS}/p9/flow-recap-last.png` });
  await page.getByTestId("recap-next").click();
  await expect(page.getByTestId("recap-card")).toHaveCount(0);

  // A second arc in another look and season: the whole app takes its theme.
  await page.getByRole("link", { name: "Arcs" }).click();
  await page.getByTestId("start-arc").click();
  await page.getByTestId("look-night").click();
  await page.getByTestId("season-summer").click();
  await page.getByLabel("Arc name").fill("Night Run");
  await page.getByTestId("plant-arc").click();
  await expect(page.getByTestId("arc-name")).toHaveText("Night Run");
  await expect(html(page)).toHaveAttribute("data-look", "night");
  await expect(html(page)).toHaveAttribute("data-season", "summer");

  // Switching back brings back the first arc's own theme.
  await page.getByTestId("arc-switcher").click();
  await page.getByTestId("arc-option").filter({ hasText: "First Arc" }).click();
  await expect(page.getByTestId("arc-name")).toHaveText("First Arc");
  await expect(html(page)).toHaveAttribute("data-look", "journal");
  await expect(html(page)).toHaveAttribute("data-season", "autumn");

  // Export, reset, then import the backup: everything comes back.
  await page.getByRole("link", { name: "Settings" }).click();
  const download = page.waitForEvent("download");
  await page.getByTestId("export").click();
  const file = await (await download).path();
  const exported = JSON.parse(await readFile(file!, "utf8")) as AppState;
  expect(exported.arcs.map((a) => a.name).sort()).toEqual(["First Arc", "Night Run"]);
  await page.getByTestId("reset-arc").click();
  await page.getByTestId("confirm-yes").click();
  // The reset arc starts again today with nothing checked; the three kept days are gone from Progress.
  await expect.poll(async () => {
    const st = await readState(page);
    const mine = Object.values(st.logs).filter((l) => l.arcId === st.activeArcId);
    return mine.length > 0 && mine.every((l) => l.completedHabitIds.length === 0);
  }).toBe(true);
  await page.getByRole("link", { name: "Progress" }).click();
  await expect(page.getByTestId("tile-kept")).toHaveText("0");
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByTestId("import-file").setInputFiles(file!);
  await page.getByTestId("confirm-yes").click();
  await expect(page.getByTestId("data-note")).toHaveText("Backup imported.");
  await page.getByRole("link", { name: "Progress" }).click();
  await expect(page.getByTestId("tile-kept")).toHaveText("3");
  // A found visitor appears in the garden only on full days; today has no check-offs, so look in the collection.
  await page.goto("#/visitors");
  // A 30-day arc scales the counts down (3 in a row, 3 full, 3 kept, 3 full in a row), so day 3 brought four.
  await expect(page.getByTestId("found-count")).toHaveText("4 of 9 found this autumn");

  // Everything survives a reload.
  await page.reload();
  const final = await readState(page);
  expect(final.visitors.map((v) => v.visitorId).sort()).toEqual(["autumn-crow", "autumn-fox", "autumn-hedgehog", "autumn-squirrel"]);
  expect(final.arcs.filter((a) => !a.deleted)).toHaveLength(2);
});
