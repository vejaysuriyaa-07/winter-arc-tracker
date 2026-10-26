// Phase 1: theme tokens and the garden engine, through the showcase route.
import { expect, test, type Page } from "@playwright/test";
import { SHOTS, seed, stateWithArc } from "./helpers";

const LOOKS = ["journal", "greenhouse", "night"] as const;
const SEASONS = ["winter", "spring", "summer", "autumn"] as const;
const MOODS = ["great", "good", "okay", "low", "rough"] as const;

async function open(page: Page, q: string): Promise<void> {
  await page.goto(`#/dev/showcase?${q}`);
  await expect(page.getByTestId("garden")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Waits a number of animation frames (frame-counted, not wall time). */
const frames = (page: Page, n = 12) =>
  page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let i = 0;
        const step = (): void => {
          if (++i >= count) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    n,
  );

const plantTransform = (page: Page) =>
  page.getByTestId("plant").first().locator("div").first().evaluate((el) => (el as HTMLElement).style.transform);

test("the scene animates, then freezes under reduced motion", async ({ page }) => {
  await open(page, "look=journal&season=spring&mood=rough");
  await expect(page.getByTestId("garden")).toHaveAttribute("data-motion", "on");
  const a = await plantTransform(page);
  await expect.poll(() => plantTransform(page)).not.toBe(a);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("garden")).toHaveAttribute("data-motion", "off");
  const b = await plantTransform(page);
  await frames(page);
  expect(await plantTransform(page)).toBe(b);
});

test("the frozen frame is redrawn when the scene changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "season=winter&mood=good");
  await open(page, "season=winter&mood=rough");
  // Snow drop i sits at x = (i*47)%356 + sin(i)*8, y = (i*73)%300 % 310 - 10 in the static frame.
  const i = 40;
  const x = ((i * 47) % 356) + Math.sin(i) * 8;
  const y = (((i * 73) % 300) % 310) - 10;
  const drop = page.getByTestId("drop").nth(i);
  const pos = await drop.evaluate((el) => {
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec((el as HTMLElement).style.transform);
    return m ? [Number(m[1]), Number(m[2])] : null;
  });
  expect(pos![0]).toBeCloseTo(x, 1);
  expect(pos![1]).toBeCloseTo(y, 1);
});

test("the loop pauses while the page is hidden", async ({ page }) => {
  await open(page, "look=journal&season=summer&mood=rough");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const b = await plantTransform(page);
  await frames(page);
  expect(await plantTransform(page)).toBe(b);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => plantTransform(page)).not.toBe(b);
});

test("utilities inside a theme scope use the scope's colours and fonts", async ({ page }) => {
  await open(page, "look=night&season=autumn");
  const probe = page.getByTestId("scope-probe");
  await expect(probe).toHaveCSS("color", "rgb(163, 157, 140)"); // night muted #A39D8C
  await expect(probe).toHaveCSS("border-bottom-color", "rgb(42, 48, 38)"); // night line #2A3026
  expect(await probe.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"Instrument Serif"/);
});

test("the Settings motion toggle freezes the scene too", async ({ page }) => {
  const s = stateWithArc({ startDate: "2026-10-01" });
  s.settings.motion = false;
  await seed(page, s);
  await open(page, "look=greenhouse&season=winter&mood=low");
  await expect(page.getByTestId("garden")).toHaveAttribute("data-motion", "off");
  const b = await plantTransform(page);
  await frames(page);
  expect(await plantTransform(page)).toBe(b);
});

test("growth, flowers, birds and weather follow the props", async ({ page }) => {
  await open(page, "season=winter&day=1&done=0");
  const g = page.getByTestId("garden");
  await expect(g).toHaveAttribute("data-flowers", "5");
  await expect(g).toHaveAttribute("data-birds", "0");
  for (const p of await page.getByTestId("plant").all()) await expect(p).toHaveAttribute("data-g", "0.000");
  await page.screenshot({ path: `${SHOTS}/p1-day1-winter.png` });

  await open(page, "season=summer&day=90&done=9");
  await expect(g).toHaveAttribute("data-birds", "5");
  await expect(g).toHaveAttribute("data-bloom", "true");
  await expect(page.getByTestId("plant").first()).toHaveAttribute("data-g", "1.000");
  await page.screenshot({ path: `${SHOTS}/p1-day90-summer.png` });
});

test("sky events", async ({ page }) => {
  await open(page, "season=spring&event=night");
  await expect(page.getByTestId("moon")).toBeVisible();
  await expect(page.getByTestId("star")).toHaveCount(34);
  await expect(page.getByTestId("firefly")).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/p1-event-night-spring.png` });

  await open(page, "season=summer&event=fireflies&done=9");
  await expect(page.getByTestId("firefly")).toHaveCount(14);
  await page.screenshot({ path: `${SHOTS}/p1-event-fireflies-summer.png` });

  await open(page, "season=winter&event=aurora&done=9");
  await expect(page.getByTestId("aurora")).toHaveCount(3);
  await expect(page.getByTestId("star")).toHaveCount(48);
  await page.screenshot({ path: `${SHOTS}/p1-event-aurora-winter.png` });

  await open(page, "season=autumn&mood=rough&event=rainbow&done=9");
  await expect(page.getByTestId("rainbow")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/p1-event-rainbow-autumn.png` });

  await open(page, "season=winter&event=shooting");
  await expect(page.getByTestId("shooting-star")).toHaveCount(1);
});

test("the Night look has its own sky layer", async ({ page }) => {
  await open(page, "look=night&season=winter");
  await expect(page.getByTestId("night-sky")).toBeAttached();
  await open(page, "look=journal&season=winter");
  await expect(page.getByTestId("night-sky")).toHaveCount(0);
});

for (const look of LOOKS) {
  test(`chrome screenshots: ${look} in every season`, async ({ page }) => {
    for (const season of SEASONS) {
      await open(page, `look=${look}&season=${season}&mood=good&done=5`);
      await expect(page.getByTestId("showcase")).toHaveAttribute("data-look", look);
      await page.screenshot({ path: `${SHOTS}/p1-chrome-${look}-${season}.png` });
    }
  });
}

for (const season of SEASONS) {
  test(`garden screenshots: ${season} in every mood`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const mood of MOODS) {
      await open(page, `season=${season}&mood=${mood}&day=55&done=6`);
      await expect(page.getByTestId("garden")).toHaveAttribute("data-mood", mood);
      await page.getByTestId("garden").screenshot({ path: `${SHOTS}/p1-garden-${season}-${mood}.png` });
    }
  });
}
