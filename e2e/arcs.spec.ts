// Phase 3: arcs, new arc, theme picker, switching, night in dark mode, arc complete.
import { expect, test, type Page } from "@playwright/test";
import { SHOTS, noonLA, readState, seed, stateWithArc, withLogs } from "./helpers";
import { createArc } from "../src/lib/mutations";
import type { AppState, Look, Season } from "../src/types";

const TODAY = "2026-10-26";
const T = "2026-10-01T00:00:00.000Z";

async function openAt(page: Page, state: AppState | null, path = "#/", day = TODAY): Promise<void> {
  await page.clock.setFixedTime(noonLA(day));
  if (state) await seed(page, state);
  await page.goto(path);
}

const html = (page: Page) => page.locator("html");

function twoArcs(): AppState {
  const s = stateWithArc({ startDate: "2026-10-01", name: "Winter Arc", season: "winter", look: "journal" });
  return createArc(s, T, { name: "Study Arc", season: "spring", look: "greenhouse", startDate: "2026-10-10", lengthDays: 30, habits: [{ name: "Read papers" }] });
}

test("a first arc from scratch: the New arc screen restyles live and the app takes its theme", async ({ page }) => {
  await openAt(page, null, "#/arcs");
  await expect(page.getByTestId("no-arcs")).toBeVisible();
  await page.getByTestId("start-arc").click();
  const screen = page.getByTestId("new-arc");
  await expect(screen).toHaveAttribute("data-season", "autumn"); // October defaults to autumn
  await page.getByTestId("look-greenhouse").click();
  await page.getByTestId("season-spring").click();
  await expect(screen).toHaveAttribute("data-look", "greenhouse");
  await expect(screen).toHaveAttribute("data-season", "spring");
  await expect(page.getByLabel("Arc name")).toHaveAttribute("placeholder", "Spring Arc");
  await page.getByLabel("Arc name").fill("Study Arc");
  await page.getByRole("radio", { name: "30 days" }).click();
  for (const h of ["Read", "Walk"]) {
    await page.getByLabel("Add a habit to this arc").fill(h);
    await page.getByLabel("Add a habit to this arc").press("Enter");
  }
  await page.screenshot({ path: `${SHOTS}/p3-new-arc-greenhouse-spring.png` });
  await page.getByTestId("plant-arc").click();

  await expect(page.getByTestId("arc-name")).toHaveText("Study Arc");
  await expect(page.getByTestId("habit-row")).toHaveCount(2);
  await expect(html(page)).toHaveAttribute("data-look", "greenhouse");
  await expect(html(page)).toHaveAttribute("data-season", "spring");
  const s = await readState(page);
  expect(s.arcs[0]).toMatchObject({ name: "Study Arc", look: "greenhouse", season: "spring", lengthDays: 30, startDate: TODAY });
});

test("custom length and a later start", async ({ page }) => {
  await openAt(page, null, "#/arcs/new");
  await page.getByRole("radio", { name: "Custom" }).click();
  await page.getByLabel("Custom length in days").fill("21");
  await page.getByLabel("Start date").fill("2026-11-02");
  await page.getByTestId("plant-arc").click();
  await expect(page.getByTestId("starts-in")).toHaveText("Starts in 7 days");
  const s = await readState(page);
  expect(s.arcs[0]).toMatchObject({ lengthDays: 21, startDate: "2026-11-02", name: "Autumn Arc" });
});

test("New arc survives a cleared start date and refuses lengths it cannot keep", async ({ page }) => {
  await openAt(page, null, "#/arcs/new");
  await page.getByLabel("Start date").fill("");
  await expect(page.getByText("Pick today or a later day.")).toBeVisible();
  await expect(page.getByTestId("plant-arc")).toBeDisabled();
  await page.getByLabel("Start date").fill(TODAY);
  await page.getByRole("radio", { name: "Custom" }).click();
  for (const v of ["", "0", "999"]) {
    await page.getByLabel("Custom length in days").fill(v);
    await expect(page.getByTestId("plant-arc")).toBeDisabled();
  }
  await page.getByLabel("Custom length in days").fill("365");
  await expect(page.getByTestId("plant-arc")).toBeEnabled();
});

test("Cancel on a cold-loaded New arc goes to the Arcs tab", async ({ page }) => {
  await openAt(page, null, "#/arcs/new");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Your arcs" })).toBeVisible();
});

test("the look and season cards work with arrow keys", async ({ page }) => {
  await openAt(page, null, "#/arcs/new");
  await page.getByTestId("look-journal").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("look-greenhouse")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("look-greenhouse")).toBeFocused();
  await expect(page.getByTestId("look-journal")).toHaveAttribute("tabindex", "-1");
});

test("bring habits from the current arc", async ({ page }) => {
  await openAt(page, stateWithArc({ startDate: "2026-10-01" }), "#/arcs/new");
  await expect(page.getByTestId("bring-habits")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("habit-chip")).toHaveCount(3);
  await page.getByTestId("habit-chip").filter({ hasText: "Gym" }).click();
  await page.getByTestId("plant-arc").click();
  await expect(page.getByTestId("habit-row")).toHaveCount(2);
  const s = await readState(page);
  const newArc = s.arcs.find((a) => a.id === s.activeArcId)!;
  expect(s.habits.filter((h) => h.arcId === newArc.id).map((h) => [h.name, h.createdAt])).toEqual([["Read", TODAY], ["Meditation", TODAY]]);
  // The old arc keeps its own habits.
  expect(s.habits.filter((h) => h.arcId !== newArc.id)).toHaveLength(3);
});

test("switching arcs switches the whole app's look; each card shows its own theme", async ({ page }) => {
  await openAt(page, twoArcs());
  await expect(html(page)).toHaveAttribute("data-look", "greenhouse"); // the newest arc is active
  await page.getByTestId("arc-switcher").click();
  await page.getByTestId("arc-option").filter({ hasText: "Winter Arc" }).click();
  await expect(page.getByTestId("arc-name")).toHaveText("Winter Arc");
  await expect(html(page)).toHaveAttribute("data-look", "journal");
  await expect(html(page)).toHaveAttribute("data-season", "winter");

  await page.getByRole("link", { name: "Arcs" }).click();
  const cards = page.getByTestId("arc-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.filter({ hasText: "Study Arc" })).toHaveAttribute("data-look", "greenhouse");
  await expect(cards.filter({ hasText: "Winter Arc" })).toHaveAttribute("data-look", "journal");
  await expect(cards.filter({ hasText: "Study Arc" }).getByTestId("arc-status")).toHaveText("Day 17 of 30");
  await page.screenshot({ path: `${SHOTS}/p3-arcs-list.png` });
  await cards.filter({ hasText: "Study Arc" }).getByRole("button").click();
  await expect(page.getByTestId("arc-name")).toHaveText("Study Arc");
  await expect(html(page)).toHaveAttribute("data-look", "greenhouse");
  await page.reload();
  await expect(page.getByTestId("arc-name")).toHaveText("Study Arc"); // remembered
});

test("the theme picker in Settings restyles live and applies to this arc only", async ({ page }) => {
  await openAt(page, twoArcs(), "#/settings");
  await expect(page.getByTestId("theme-row")).toContainText("Greenhouse, spring");
  await page.getByTestId("theme-row").click();
  const picker = page.getByTestId("theme-picker");
  await picker.getByTestId("look-night").click();
  await picker.getByTestId("season-summer").click();
  await expect(page.getByTestId("theme-preview")).toHaveAttribute("data-look", "night");
  await expect(page.getByTestId("theme-preview")).toHaveAttribute("data-season", "summer");
  await expect(html(page)).toHaveAttribute("data-look", "greenhouse"); // not applied yet
  await page.screenshot({ path: `${SHOTS}/p3-theme-picker-night-summer.png` });
  await page.getByRole("button", { name: "Use this theme" }).click();
  await expect(html(page)).toHaveAttribute("data-look", "night");
  await expect(html(page)).toHaveAttribute("data-season", "summer");
  await expect(page.getByTestId("theme-row")).toContainText("Night, summer");
  const s = await readState(page);
  expect(s.arcs.find((a) => a.name === "Study Arc")).toMatchObject({ look: "night", season: "summer" });
  expect(s.arcs.find((a) => a.name === "Winter Arc")).toMatchObject({ look: "journal", season: "winter" });
});

test("Night takes over in dark mode while the setting is on", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openAt(page, stateWithArc({ startDate: "2026-10-01" }), "#/settings");
  await expect(html(page)).toHaveAttribute("data-look", "night");
  await page.getByTestId("settings-auto-night").click();
  await expect(html(page)).toHaveAttribute("data-look", "journal");
  await page.getByTestId("settings-auto-night").click();
  await expect(html(page)).toHaveAttribute("data-look", "night");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(html(page)).toHaveAttribute("data-look", "journal");
});

test("arc complete shows once after the last day, then the garden is frozen", async ({ page }) => {
  const days: Record<string, string[]> = {};
  for (let d = 1; d <= 30; d++) days[`2026-09-${String(d).padStart(2, "0")}`] = d % 5 === 0 ? ["Read"] : ["Read", "Gym", "Meditation"];
  const s = withLogs(stateWithArc({ startDate: "2026-09-01", lengthDays: 30 }), days);
  await openAt(page, s);
  const overlay = page.getByTestId("arc-complete");
  await expect(overlay).toBeVisible();
  await expect(page.getByTestId("complete-garden")).toHaveAttribute("data-birds", "5"); // the flock
  // 24 full days of 3, 6 days of 1: (72 + 6) / 90 = 86.7%
  await expect(page.getByTestId("complete-score")).toHaveText("87%");
  await expect(page.getByTestId("complete-full")).toHaveText("24");
  await expect(page.getByTestId("complete-best")).toHaveText("4");
  await page.screenshot({ path: `${SHOTS}/p3-arc-complete-journal-winter.png` });
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(overlay).toHaveCount(0);
  const after = await readState(page);
  expect(after.arcs[0]!.frozenAt).toBeTruthy();
  expect(after.ui.celebrated[`arc:${after.arcs[0]!.id}`]).toBe(true);
  await page.reload();
  await expect(page.getByTestId("arc-finished")).toBeVisible();
  await expect(overlay).toHaveCount(0);
});

test("arc complete arrives live when the last day ends with the app open", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-30T23:59:00-07:00") });
  await seed(page, stateWithArc({ startDate: "2026-10-01", lengthDays: 30 })); // last day Oct 30
  await page.goto("#/");
  await expect(page.getByTestId("habit-row").first()).toBeVisible();
  await expect(page.getByTestId("arc-complete")).toHaveCount(0);
  await page.clock.fastForward(2 * 60 * 1000);
  await expect(page.getByTestId("arc-complete")).toBeVisible();
  await page.getByRole("button", { name: "Start your next arc" }).click();
  await expect(page.getByTestId("new-arc")).toBeVisible();
});

test("two arcs ending the same day both celebrate, one Escape closes one", async ({ page }) => {
  const s = createArc(stateWithArc({ startDate: "2026-09-01", lengthDays: 30, name: "First" }), T, { name: "Second", season: "spring", look: "greenhouse", startDate: "2026-09-11", lengthDays: 20 });
  await openAt(page, s);
  const overlay = page.getByTestId("arc-complete");
  await expect(overlay).toHaveAttribute("aria-label", "First is complete");
  await expect(overlay.getByRole("button", { name: "Start your next arc" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(overlay).toHaveAttribute("aria-label", "Second is complete");
  await page.keyboard.down("Escape"); // a held key repeats; only the first press counts
  await page.keyboard.up("Escape");
  await expect(overlay).toHaveCount(0);
  const after = await readState(page);
  expect(after.arcs.every((a) => a.frozenAt)).toBe(true);
});

test("an open overlay takes focus and the page behind is inert", async ({ page }) => {
  await openAt(page, stateWithArc({ startDate: "2026-10-01" }), "#/settings");
  await page.getByTestId("theme-row").click();
  await expect(page.locator("#root")).toHaveAttribute("inert", "");
  await expect(page.getByTestId("theme-picker").locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
  await expect(page.getByTestId("theme-row")).toBeFocused(); // focus returns
});

const LOOKS: Look[] = ["journal", "greenhouse", "night"];
const SEASONS: Season[] = ["winter", "summer"];
for (const look of LOOKS) {
  for (const season of SEASONS) {
    test(`phase 3 screenshots: ${look}, ${season}`, async ({ page }) => {
      const base = createArc(stateWithArc({ startDate: "2026-10-01", look, season, name: "Main Arc" }), T, {
        name: "Side Arc", season: season === "winter" ? "autumn" : "spring", look: look === "night" ? "journal" : "night", startDate: "2026-11-02", lengthDays: 60,
      });
      const s = { ...base, activeArcId: base.arcs[0]!.id };
      await openAt(page, s, "#/arcs");
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${SHOTS}/p3-arcs-${look}-${season}.png` });
      await page.goto("#/settings");
      await page.getByTestId("theme-row").click();
      await page.screenshot({ path: `${SHOTS}/p3-picker-${look}-${season}.png` });
      await page.goto("#/arcs/new");
      await page.getByTestId(`look-${look}`).click();
      await page.getByTestId(`season-${season}`).click();
      await page.screenshot({ path: `${SHOTS}/p3-new-arc-${look}-${season}.png` });
    });
  }
}
