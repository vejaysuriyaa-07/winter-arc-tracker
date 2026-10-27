// Phase 8: what the web build shows of the iPhone-only pieces.
import { expect, test } from "@playwright/test";
import { SHOTS, noonLA, seed, stateWithArc, withLogs } from "./helpers";
import type { Look, Season } from "../src/types";

test("the web build never offers iPhone reminders", async ({ page }) => {
  await page.clock.setFixedTime(noonLA("2026-10-26"));
  const s = withLogs(stateWithArc({ startDate: "2026-10-01" }), { "2026-10-24": ["Read", "Gym", "Meditation"] });
  s.ui.signInPrompted = true;
  await seed(page, s);
  await page.goto("#/");
  await expect(page.getByTestId("garden")).toBeVisible();
  await expect(page.getByTestId("reminders-prompt")).toHaveCount(0);
});

const LOOKS: Look[] = ["journal", "greenhouse", "night"];
const SEASONS: Season[] = ["winter", "summer"];
for (const look of LOOKS) {
  for (const season of SEASONS) {
    test(`phase 8 reminders card: ${look}, ${season}`, async ({ page }) => {
      await page.goto(`#/dev/showcase?view=reminders&look=${look}&season=${season}`);
      await expect(page.getByTestId("reminders-prompt")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${SHOTS}/p8-reminders-${look}-${season}.png` });
    });
  }
}
