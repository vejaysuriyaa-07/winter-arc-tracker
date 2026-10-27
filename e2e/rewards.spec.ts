// Phase 5: visitors, rare skies, Sunday recap.
import { expect, test, type Page } from "@playwright/test";
import { SHOTS, readState, seed, stateWithArc, withArcId, withLogs } from "./helpers";
import { rareRoll } from "../src/lib/visitors";
import { addDays, eachDay } from "../src/lib/dates";
import type { AppState, Look, Season } from "../src/types";

/** An arc id whose rare roll stays quiet over the whole test window, so only the ladder unlocks. */
function quietId(from: string, to: string): string {
  for (let k = 0; ; k++) {
    const id = `00000000-0000-4000-a000-${String(k).padStart(12, "0")}`;
    if (eachDay(from, to).every((d) => !rareRoll(id, d))) return id;
  }
}
const ID = quietId("2026-09-01", "2026-12-31");
const ALL = ["Read", "Gym", "Meditation"];

function arc(extra: Partial<Parameters<typeof stateWithArc>[0]> = {}, days: Record<string, string[]> = {}, moods: Record<string, "low" | "rough"> = {}): AppState {
  return withArcId(withLogs(stateWithArc({ startDate: "2026-10-01", ...extra }), days, moods), ID);
}
const local = (ymd: string, hh: number, mm = 0) => new Date(`${ymd}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00-07:00`);

async function openAt(page: Page, state: AppState, when: Date, path = "#/"): Promise<void> {
  await page.clock.setFixedTime(when);
  await seed(page, state);
  await page.goto(path);
}

test("a visitor arrives live once: toast, entrance in the garden, then stays found", async ({ page }) => {
  await openAt(page, arc({}, { "2026-10-24": ALL, "2026-10-25": ALL }), local("2026-10-26", 12));
  await expect(page.getByTestId("garden-visitor")).toHaveCount(0);
  await expect(page.getByTestId("chain-teaser")).toHaveText("1 more kept day in a row and a Robin visits");
  for (const n of ALL) await page.getByTestId("habit-row").filter({ hasText: n }).click();
  await expect(page.getByText("A Robin moved in")).toBeVisible();
  const v = page.getByTestId("garden-visitor");
  await expect(v).toHaveAttribute("data-visitor", "winter-robin");
  await expect(v).toHaveAttribute("data-entrance", "true");
  await page.screenshot({ path: `${SHOTS}/p5-visitor-arrival.png` });
  await expect.poll(async () => Object.keys((await readState(page)).ui.celebrated).some((k) => k.startsWith("visitor:")), { timeout: 5000 }).toBe(true);

  await page.reload();
  await expect(page.getByTestId("garden-visitor")).toHaveAttribute("data-entrance", "false");
  await expect(page.getByText("A Robin moved in")).toHaveCount(0);
  const s = await readState(page);
  expect(s.visitors.map((x) => [x.visitorId, x.foundOn])).toEqual([["winter-robin", "2026-10-26"]]);

  await page.goto("#/visitors");
  await expect(page.getByTestId("found-count")).toHaveText("1 of 9 found this winter");
  await expect(page.locator('[data-testid="visitor-tile"][data-found="true"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="visitor-tile"][data-found="true"]')).toContainText("Came on day 26");
  await expect(page.getByTestId("next-visitor")).toContainText("Cardinal");
});

test("visitors earned before this launch join quietly, never on load", async ({ page }) => {
  const days: Record<string, string[]> = {};
  for (let d = 10; d <= 25; d++) days[`2026-10-${d}`] = ALL;
  await openAt(page, arc({}, days), local("2026-10-26", 12), "#/visitors");
  await expect(page.getByText(/moved in/)).toHaveCount(0);
  // 16 full days in a row: robin, cardinal, rabbit, squirrel, red fox, deer (Oct 12-18), northern lights (Oct 19-25).
  await expect(page.getByTestId("found-count")).toHaveText("7 of 9 found this winter");
  const s = await readState(page);
  expect(s.visitors.find((v) => v.visitorId === "winter-robin")!.foundOn).toBe("2026-10-12");
  for (const v of s.visitors) expect(s.ui.celebrated[`visitor:${v.id}`]).toBe(true);
  await page.screenshot({ path: `${SHOTS}/p5-visitors-journal-winter.png` });
});

test("changing an arc's season keeps its visitors and never bursts into toasts", async ({ page }) => {
  const days: Record<string, string[]> = {};
  for (let d = 5; d <= 25; d++) days[`2026-10-${String(d).padStart(2, "0")}`] = ALL;
  await openAt(page, arc({}, days), local("2026-10-26", 12), "#/settings");
  await page.getByTestId("theme-row").click();
  await page.getByTestId("theme-picker").getByTestId("season-spring").click();
  await page.getByRole("button", { name: "Use this theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-season", "spring");
  await expect(page.getByText(/moved in/)).toHaveCount(0);
  await page.goto("#/progress");
  const row = await page.getByTestId("visitors-link").innerText();
  const n = Number(/(\d+) of 9 found/.exec(row)![1]);
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(9);
  await page.goto("#/visitors");
  await page.getByRole("radio", { name: /Winter/ }).click();
  await expect(page.getByTestId("found-count")).not.toHaveText("0 of 9 found this winter"); // winter visitors stay found
});

test("a found visitor shows up in the garden on later full days", async ({ page }) => {
  const days: Record<string, string[]> = { "2026-10-20": ALL, "2026-10-21": ALL, "2026-10-22": ALL, "2026-10-26": ALL };
  await openAt(page, arc({}, days), local("2026-10-26", 12));
  await expect(page.getByTestId("garden-visitor")).toHaveAttribute("data-visitor", "winter-robin");
  await expect(page.getByTestId("garden-visitor")).toHaveAttribute("data-entrance", "false");
});

test("night sky from 19:00, fireflies on a full summer night", async ({ page }) => {
  await openAt(page, arc({ season: "summer" }, { "2026-10-26": ALL }), local("2026-10-26", 18, 59));
  await expect(page.getByTestId("moon")).toHaveCount(0);
  await page.clock.setFixedTime(local("2026-10-26", 21));
  await page.reload();
  await expect(page.getByTestId("moon")).toBeVisible();
  await expect(page.getByTestId("firefly")).toHaveCount(14);
  await page.screenshot({ path: `${SHOTS}/p5-sky-fireflies.png` });
});

test("northern lights within 7 days of a perfect week, in winter at night", async ({ page }) => {
  const days: Record<string, string[]> = {};
  for (let d = 12; d <= 18; d++) days[`2026-10-${d}`] = ALL; // Mon Oct 12 to Sun Oct 18
  await openAt(page, arc({}, days), local("2026-10-25", 21));
  await expect(page.getByTestId("aurora")).toHaveCount(3);
  await page.screenshot({ path: `${SHOTS}/p5-sky-aurora.png` });
  await page.clock.setFixedTime(local("2026-10-26", 21));
  await page.reload();
  await expect(page.getByTestId("moon")).toBeVisible();
  await expect(page.getByTestId("aurora")).toHaveCount(0); // 8 days after
});

test("a rainbow after a low day turns full", async ({ page }) => {
  await openAt(page, arc({ season: "spring" }, { "2026-10-26": ["Read", "Gym"] }, { "2026-10-26": "low" }), local("2026-10-26", 14));
  await expect(page.getByTestId("rainbow")).toHaveCount(0);
  await page.getByTestId("habit-row").filter({ hasText: "Meditation" }).click();
  await expect(page.getByTestId("rainbow")).toBeVisible();
  await expect(page.getByTestId("garden")).toHaveAttribute("data-mood", "low");
  await page.screenshot({ path: `${SHOTS}/p5-sky-rainbow.png` });
});

test("the Sunday recap opens from 18:00, steps through, shares, and is then seen", async ({ page }) => {
  const days: Record<string, string[]> = {};
  for (let d = 12; d <= 25; d++) days[`2026-10-${d}`] = d < 19 ? ["Read"] : ALL;
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }); // force the download path
  });
  const s = arc({}, days);
  // Earlier weeks were already read; only the week ending today is new.
  s.ui.recapSeen = ["2026-09-28", "2026-10-05", "2026-10-12"].map((m) => `${ID}:${m}`);
  await openAt(page, s, local("2026-10-25", 17, 59));
  await expect(page.getByTestId("recap-card")).toHaveCount(0);
  await page.clock.setFixedTime(local("2026-10-25", 18, 1));
  await page.reload();
  await page.getByTestId("recap-card").click();
  await expect(page.getByTestId("recap-slide")).toHaveAttribute("data-slide", "score");
  await expect(page.getByTestId("recap-score")).toHaveText("100%");
  await expect(page.getByTestId("best-week")).toBeVisible();
  await expect(page.getByTestId("recap-seg")).toHaveCount(4); // robin and others came this week
  await page.screenshot({ path: `${SHOTS}/p5-recap-1.png` });
  const download = page.waitForEvent("download");
  await page.getByTestId("recap-share").click();
  expect((await download).suggestedFilename()).toMatch(/^grove-week-\d+\.png$/);

  await page.getByTestId("recap-next").click();
  await expect(page.getByTestId("recap-slide")).toHaveAttribute("data-slide", "grew");
  await page.screenshot({ path: `${SHOTS}/p5-recap-2.png` });
  await page.getByTestId("recap-prev").click();
  await expect(page.getByTestId("recap-slide")).toHaveAttribute("data-slide", "score");
  await page.getByTestId("recap-next-zone").click();
  await page.getByTestId("recap-next").click();
  await expect(page.getByTestId("recap-slide")).toHaveAttribute("data-slide", "visitor");
  await page.screenshot({ path: `${SHOTS}/p5-recap-3.png` });
  await page.getByTestId("recap-next").click();
  await expect(page.getByTestId("recap-slide")).toHaveAttribute("data-slide", "highlights");
  await expect(page.getByTestId("highlight").first()).toContainText("Never missed");
  await page.screenshot({ path: `${SHOTS}/p5-recap-4.png` });
  await page.getByTestId("recap-next").click(); // Done
  await expect(page.getByTestId("weekday")).toBeVisible();
  await expect(page.getByTestId("recap-card")).toHaveCount(0);
});

const LOOKS: Look[] = ["journal", "greenhouse", "night"];
const SEASONS: Season[] = ["spring", "autumn"];
for (const look of LOOKS) {
  for (const season of SEASONS) {
    test(`phase 5 screenshots: ${look}, ${season}`, async ({ page }) => {
      const days: Record<string, string[]> = {};
      for (let d = 5; d <= 25; d++) days[`2026-10-${String(d).padStart(2, "0")}`] = d % 9 === 0 ? ["Read"] : ALL;
      await openAt(page, arc({ look, season }, days), local("2026-10-26", 12), "#/visitors");
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${SHOTS}/p5-visitors-${look}-${season}.png` });
      await page.goto("#/");
      await page.screenshot({ path: `${SHOTS}/p5-garden-${look}-${season}.png` });
    });
  }
}
void addDays;
