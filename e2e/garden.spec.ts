// Phase 2: the Garden tab (SPEC 5.1, 4.2, 7.1, 7.2).
import { expect, test, type Page } from "@playwright/test";
import { SHOTS, noonLA, readState, seed, stateWithArc, withLogs } from "./helpers";
import type { AppState, Look, Season } from "../src/types";

const TODAY = "2026-10-26"; // Monday, day 26 of an arc that started Oct 1

function arcState(extra: Partial<Parameters<typeof stateWithArc>[0]> = {}): AppState {
  return stateWithArc({ startDate: "2026-10-01", ...extra });
}

async function openAt(page: Page, state: AppState, day = TODAY): Promise<void> {
  await page.clock.setFixedTime(noonLA(day));
  await seed(page, state);
  await page.goto("#/");
  await expect(page.getByTestId("garden")).toBeVisible();
}

const row = (page: Page, name: string) => page.getByTestId("habit-row").filter({ hasText: name });
/** Waits a number of animation frames (frame-counted, not wall time). */
const frames = (page: Page, n = 12) =>
  page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let i = 0;
        const step = (): void => (++i >= count ? resolve() : void requestAnimationFrame(step));
        requestAnimationFrame(step);
      }),
    n,
  );

/** A habit's plant, found by the habit's id (DOM order is back row first, not list order). */
async function plantG(page: Page, name: string): Promise<number> {
  const id = (await readState(page)).habits.find((h) => h.name === name)!.id;
  return Number(await page.locator(`[data-testid="plant"][data-id="${id}"]`).getAttribute("data-g"));
}

test("checking a habit grows its plant, fills a petal, updates counts, and survives a reload", async ({ page }) => {
  await openAt(page, arcState());
  await expect(page.getByTestId("weekday")).toHaveText("Monday");
  await expect(page.getByTestId("date")).toHaveText("October 26");
  await expect(page.getByTestId("count")).toHaveText("0 of 3");
  const before = await plantG(page, "Read");

  await row(page, "Read").click();
  await expect(row(page, "Read")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("count")).toHaveText("1 of 3");
  await expect(page.getByTestId("progress-line")).toHaveAttribute("data-percent", "33");
  await expect(page.getByTestId("bloom-mini")).toHaveAttribute("data-done", "1");
  await expect.poll(() => plantG(page, "Read")).toBeGreaterThan(before);
  await expect(row(page, "Read")).toHaveAttribute("data-anim-played", "1"); // the check animation ran

  await page.reload();
  await expect(row(page, "Read")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("count")).toHaveText("1 of 3");
});

test("mood changes the weather instantly and is saved for the day", async ({ page }) => {
  await openAt(page, arcState(), TODAY);
  await expect(page.getByTestId("garden")).toHaveAttribute("data-mood", "good");
  await page.getByRole("button", { name: "Rough" }).click();
  await expect(page.getByTestId("garden")).toHaveAttribute("data-mood", "rough");
  await expect(page.getByTestId("mood-label")).toHaveText("Rough, blizzard");
  await expect(page.getByRole("button", { name: "Rough" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByTestId("garden")).toHaveAttribute("data-mood", "rough");
  const s = await readState(page);
  expect(Object.values(s.logs).find((l) => l.date === TODAY)!.mood).toBe("rough");
});

test("streak icons show seed, sprout or flame and react to the mood", async ({ page }) => {
  const days: Record<string, string[]> = {};
  for (let d = 18; d <= 25; d++) days[`2026-10-${d}`] = d >= 24 ? ["Read", "Gym"] : ["Read"];
  await openAt(page, withLogs(arcState(), days, { [TODAY]: "low" }));
  await expect(row(page, "Read").getByTestId("streak-icon")).toHaveAttribute("data-kind", "flame"); // 8 days
  await expect(row(page, "Gym").getByTestId("streak-icon")).toHaveAttribute("data-kind", "sprout"); // 2 days
  await expect(row(page, "Meditation").getByTestId("streak-icon")).toHaveAttribute("data-kind", "seed");
  await expect(row(page, "Read").getByTestId("streak")).toHaveText("8");
  // Low in winter: snowflakes on every icon.
  await expect(page.getByTestId("icon-flake")).toHaveCount(3);
  await page.getByRole("button", { name: "Great" }).click();
  await expect(page.getByTestId("icon-flake")).toHaveCount(0);
  await expect(page.getByTestId("icon-spark")).toHaveCount(3);
  await page.getByRole("button", { name: "Okay" }).click();
  await expect(page.getByTestId("icon-cloud")).toHaveCount(3);
  await page.getByRole("button", { name: "Rough" }).click();
  await expect(page.getByTestId("icon-bolt")).toHaveCount(3);
  // Checking today extends the streak.
  await row(page, "Gym").click();
  await expect(row(page, "Gym").getByTestId("streak")).toHaveText("3");
});

test("removing a habit wilts its plant, Undo restores it, and past days never change", async ({ page }) => {
  await openAt(page, withLogs(arcState(), { "2026-10-25": ["Read", "Gym", "Meditation"] }));
  const before = (await readState(page)).logs;
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Remove Gym" }).click();
  await expect(page.getByTestId("habit-row")).toHaveCount(2);
  await expect(page.getByTestId("toast")).toContainText("Gym removed. Its tree stops growing.");
  const gym = (await readState(page)).habits.find((h) => h.name === "Gym")!;
  await expect(page.locator(`[data-testid="plant"][data-id="${gym.id}"]`)).toHaveAttribute("data-wilt", "true");
  expect((await readState(page)).logs).toEqual(before); // yesterday still 3 of 3

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("habit-row")).toHaveCount(3);
  await expect(page.locator(`[data-testid="plant"][data-id="${gym.id}"]`)).toHaveAttribute("data-wilt", "false");
});

test("the last habit plays the full-bloom moment once, never on reload", async ({ page }) => {
  await openAt(page, arcState());
  for (const n of ["Read", "Gym"]) await row(page, n).click();
  await expect(page.getByTestId("full-bloom")).toHaveCount(0);
  await row(page, "Meditation").click();
  await expect(page.getByTestId("full-bloom")).toBeVisible();
  await expect(page.getByTestId("full-bloom")).toBeInViewport(); // the card scrolls up so it is seen
  await frames(page, 30); // let the scroll and petal spring settle for the screenshot (frame-counted)
  await page.screenshot({ path: `${SHOTS}/p2-full-bloom.png` });
  await expect(page.getByTestId("garden")).toHaveAttribute("data-bloom", "true");
  await expect(page.locator('[data-testid="flower"][data-gold="true"]')).toHaveCount(1); // today's kept full day
  await expect(page.getByTestId("full-bloom")).toHaveCount(0, { timeout: 5000 });

  // Unchecking and checking again the same day does not replay it.
  await row(page, "Gym").click();
  await row(page, "Gym").click();
  await expect(page.getByTestId("full-bloom")).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("garden")).toHaveAttribute("data-bloom", "true");
  await expect(page.getByTestId("full-bloom")).toHaveCount(0);
});

test("removing the last unchecked habit does not play full bloom", async ({ page }) => {
  await openAt(page, arcState());
  for (const n of ["Read", "Gym"]) await row(page, n).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Remove Meditation" }).click();
  await expect(page.getByTestId("count")).toHaveText("2 of 2");
  await frames(page);
  await expect(page.getByTestId("full-bloom")).toHaveCount(0);
  const s = await readState(page);
  expect(Object.keys(s.ui.celebrated)).toEqual([]); // the moment is still there for a real last check
});

test("under reduced motion the streak icons still show the weather", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAt(page, withLogs(arcState(), { "2026-10-25": ["Read"] }, { [TODAY]: "low" }));
  for (const f of await page.getByTestId("icon-flake").all()) expect(Number(await f.getAttribute("opacity"))).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Great" }).click();
  for (const s of await page.getByTestId("icon-spark").all()) expect(await s.getAttribute("transform")).not.toContain("scale(0)");
});

test("a finished arc freezes: no Edit, no check-offs, no remove", async ({ page }) => {
  await openAt(page, arcState({ startDate: "2026-09-01", lengthDays: 30 }));
  await expect(page.getByTestId("arc-finished")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("New habit name")).toHaveCount(0);
  await expect(row(page, "Read")).toHaveAttribute("aria-disabled", "true");
});

test("before the start date: seeds, a countdown and no check-offs", async ({ page }) => {
  await openAt(page, arcState({ startDate: "2026-10-28" }));
  await expect(page.getByTestId("starts-in")).toHaveText("Starts in 2 days");
  for (const p of await page.getByTestId("plant").all()) await expect(p).toHaveAttribute("data-g", "0.000");
  await expect(row(page, "Read")).toHaveAttribute("aria-disabled", "true");
  await row(page, "Read").click({ force: true }); // forced: Playwright will not click a disabled control
  await expect(row(page, "Read")).toHaveAttribute("aria-checked", "false");
  await expect(page.getByTestId("bloom-chain")).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/p2-before-start.png` });
});

test("quick add plants a new habit today", async ({ page }) => {
  await openAt(page, arcState());
  await page.getByLabel("New habit name").fill("Walk");
  await page.getByLabel("New habit name").press("Enter");
  await expect(page.getByTestId("habit-row")).toHaveCount(4);
  await expect(page.getByTestId("plant")).toHaveCount(4);
  await expect(page.getByLabel("New habit name")).toHaveValue("");
});

test("edit mode reorders by dragging the handle", async ({ page }) => {
  await openAt(page, arcState());
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  // Bring the list above the fixed tab bar, as a person would by scrolling.
  await page.getByTestId("habit-list").evaluate((el) => el.scrollIntoView({ block: "center" }));
  const handle = page.getByRole("button", { name: "Move Meditation", exact: true });
  const target = page.getByRole("button", { name: "Move Read", exact: true });
  const a = (await handle.boundingBox())!;
  const b = (await target.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + ((b.y - a.y - 10) * i) / 10);
  await page.mouse.up();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId("habit-row").first()).toContainText("Meditation");
  await page.reload();
  await expect(page.getByTestId("habit-row").first()).toContainText("Meditation");
});

test("the bloom chain shows the last seven days and the chain length", async ({ page }) => {
  const days: Record<string, string[]> = {
    "2026-10-20": ["Read", "Gym", "Meditation"],
    "2026-10-22": ["Read", "Gym", "Meditation"],
    "2026-10-23": ["Read", "Gym", "Meditation"],
    "2026-10-24": ["Read", "Gym", "Meditation"],
    "2026-10-25": ["Read", "Gym", "Meditation"],
  };
  await openAt(page, withLogs(arcState(), days));
  await expect(page.getByTestId("chain")).toHaveText("4");
  await expect(page.getByTestId("chain-day")).toHaveCount(7);
  const statuses = await page.getByTestId("chain-day").evaluateAll((els) => els.map((e) => e.getAttribute("data-status")));
  expect(statuses).toEqual(["full", "missed", "full", "full", "full", "full", "pending"]);
});

const LOOKS: Look[] = ["journal", "greenhouse", "night"];
const SEASONS: Season[] = ["winter", "spring", "summer", "autumn"];
for (const look of LOOKS) {
  for (const season of SEASONS) {
    test(`garden screenshots: ${look}, ${season}`, async ({ page }) => {
      const days: Record<string, string[]> = {};
      for (let d = 10; d <= 25; d++) days[`2026-10-${d}`] = d % 4 === 0 ? ["Read"] : ["Read", "Gym", "Meditation"];
      days[TODAY] = ["Read", "Gym"];
      const name = `${season[0]!.toUpperCase()}${season.slice(1)} Arc`;
      await openAt(page, withLogs(arcState({ look, season, name }), days, { [TODAY]: "good" }));
      await expect(page.getByTestId("arc-name")).toHaveText(name);
      await expect(page.getByTestId("garden")).toHaveAttribute("data-season", season);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${SHOTS}/p2-garden-${look}-${season}-top.png` });
      await page.getByTestId("bloom-chain").scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.screenshot({ path: `${SHOTS}/p2-garden-${look}-${season}-bottom.png` });
    });
  }
}
