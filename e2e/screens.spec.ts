// Phase 9: every screen in every look and season at 390x844, for review
// against docs/design. Each test checks the screen rendered before its shot.
import { expect, test, type Page } from "@playwright/test";
import { SHOTS, seed, stateWithArc, withLogs } from "./helpers";
import type { AppState, Look, Mood, Season } from "../src/types";

const LOOKS: Look[] = ["journal", "greenhouse", "night"];
const SEASONS: Season[] = ["winter", "spring", "summer", "autumn"];
const DIR = `${SHOTS}/p9`;
// Sunday 25 October 2026, 18:30 local: the week's recap is ready.
const NOW = new Date("2026-10-25T18:30:00-07:00");

/** 25 days of a believable arc: most days kept, a few full runs, a couple of misses, moods. */
function lived(look: Look, season: Season): AppState {
  const days: Record<string, string[]> = {};
  const moods: Record<string, Mood> = {};
  const pattern = [["Read", "Gym", "Meditation"], ["Read", "Gym"], ["Read", "Gym", "Meditation"], ["Read"], ["Read", "Gym", "Meditation"], [], ["Read", "Gym", "Meditation"]];
  const moodCycle: Mood[] = ["good", "great", "okay", "low", "good", "rough", "great"];
  for (let d = 1; d <= 24; d++) {
    const day = `2026-10-${String(d).padStart(2, "0")}`;
    days[day] = d >= 18 ? ["Read", "Gym", "Meditation"] : pattern[d % 7]!;
    moods[day] = moodCycle[d % 7]!;
  }
  days["2026-10-25"] = ["Read"];
  const s = withLogs(stateWithArc({ startDate: "2026-10-01", look, season }), days, moods);
  s.ui.signInPrompted = true; // the one-time card has its own screenshots
  return s;
}

async function open(page: Page, state: AppState, path: string): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await seed(page, state);
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
}

const shot = (page: Page, name: string, look: Look, season: Season): Promise<Buffer> =>
  page.screenshot({ path: `${DIR}/${name}-${look}-${season}.png` });

for (const look of LOOKS) {
  for (const season of SEASONS) {
    test.describe(`${look}, ${season}`, () => {
      test("garden, progress, month, plant, visitors", async ({ page }) => {
        const s = lived(look, season);
        await open(page, s, "#/");
        await expect(page.getByTestId("garden")).toBeVisible();
        await shot(page, "garden", look, season);
        await page.getByTestId("recap-card").scrollIntoViewIfNeeded();
        await shot(page, "garden-lower", look, season);

        await page.goto("#/progress");
        await expect(page.getByTestId("tile-kept")).toBeVisible();
        await shot(page, "progress-arc", look, season);
        await page.goto("#/progress?view=all");
        await expect(page.getByRole("radio", { name: "All time" })).toHaveAttribute("aria-checked", "true");
        await shot(page, "progress-all", look, season);

        await page.goto("#/month");
        await expect(page.getByRole("heading", { name: /October/ })).toBeVisible();
        await shot(page, "month", look, season);

        await page.goto(`#/plant/${s.habits[0]!.id}`);
        await expect(page.getByRole("heading", { name: "Read" })).toBeVisible();
        await shot(page, "plant", look, season);

        await page.goto("#/visitors");
        await expect(page.getByTestId("found-count")).toBeVisible();
        // Every season tab's label fits inside its own tab at 390px.
        for (const tab of await page.getByRole("radiogroup", { name: "Season" }).getByRole("radio").all()) {
          expect(await tab.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
        }
        await shot(page, "visitors", look, season);
      });

      test("arcs, new arc, settings, theme picker, sign in, recap", async ({ page }) => {
        const s = lived(look, season);
        await open(page, s, "#/arcs");
        await expect(page.getByTestId("arc-card")).toHaveCount(1);
        await shot(page, "arcs", look, season);

        await page.getByTestId("start-arc").click();
        await page.getByTestId(`look-${look}`).click();
        await page.getByTestId(`season-${season}`).click();
        await expect(page.getByTestId("new-arc")).toHaveAttribute("data-look", look);
        // A text field keeps its own focus style: no ring drawn around it.
        await page.getByLabel("Arc name").focus();
        expect(await page.getByLabel("Arc name").evaluate((e) => getComputedStyle(e).outlineStyle)).toBe("none");
        await shot(page, "new-arc", look, season);

        await page.goto("#/settings");
        await expect(page.getByTestId("theme-row")).toBeVisible();
        await shot(page, "settings", look, season);
        await page.getByTestId("theme-row").click();
        await expect(page.getByTestId("theme-picker")).toBeVisible();
        await shot(page, "theme-picker", look, season);

        await page.goto("#/signin");
        await expect(page.getByTestId("signin-email")).toBeVisible();
        await shot(page, "signin", look, season);

        await page.goto("#/recap/2026-10-19");
        await expect(page.getByTestId("recap-slide")).toHaveAttribute("data-slide", "score");
        await shot(page, "recap", look, season);
      });

      test("arc complete", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" }); // a settled still, no waiting on the arrival animation
        const s = lived(look, season);
        s.arcs[0] = { ...s.arcs[0]!, lengthDays: 24 }; // ended yesterday, not yet celebrated
        await open(page, s, "#/");
        await expect(page.getByTestId("arc-complete")).toBeVisible();
        // The focused button wears this arc's accent ring, never the browser's stock blue one.
        const ring = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const probe = document.createElement("span");
          probe.style.color = getComputedStyle(el).getPropertyValue("--g-accent");
          el.appendChild(probe);
          const accent = getComputedStyle(probe).color;
          probe.remove();
          return { style: getComputedStyle(el).outlineStyle, color: getComputedStyle(el).outlineColor, accent };
        });
        expect(ring.style).toBe("solid");
        expect(ring.color).toBe(ring.accent);
        await shot(page, "arc-complete", look, season);
      });
    });
  }
}
