// Phase 6: Settings and data.
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { SHOTS, noonLA, readState, seed, stateWithArc, withLogs } from "./helpers";
import type { AppState, Look, Season } from "../src/types";

const TODAY = "2026-10-26";
const ALL = ["Read", "Gym", "Meditation"];

function base(extra: Partial<Parameters<typeof stateWithArc>[0]> = {}): AppState {
  return withLogs(stateWithArc({ startDate: "2026-10-01", ...extra }), { "2026-10-24": ALL, "2026-10-25": ["Read"] });
}

async function openAt(page: Page, state: AppState | null, path = "#/settings"): Promise<void> {
  await page.clock.setFixedTime(noonLA(TODAY));
  if (state) await seed(page, state);
  await page.goto(path);
}

test("this arc: name, length, start and threshold edit through to the other tabs", async ({ page }) => {
  await openAt(page, base());
  await page.getByTestId("arc-name-field").fill("Deep Winter");
  await page.getByTestId("arc-name-field").press("Enter");
  await page.getByTestId("length-field").fill("60");
  await page.getByTestId("length-field").press("Enter");
  await page.getByTestId("threshold-field").fill("60");
  await page.getByTestId("threshold-field").press("Enter");
  await page.getByTestId("start-field").fill("2026-10-05");
  await page.getByTestId("start-field").press("Enter");
  await page.screenshot({ path: `${SHOTS}/p6-settings-journal-winter.png` });
  const s = await readState(page);
  expect(s.arcs[0]).toMatchObject({ name: "Deep Winter", lengthDays: 60, threshold: 60, startDate: "2026-10-05" });
  expect(s.habits.every((h) => h.createdAt === "2026-10-05")).toBe(true); // day-1 habits move with the start
  await page.getByRole("link", { name: "Garden" }).click();
  await expect(page.getByTestId("arc-name")).toHaveText("Deep Winter");
  await page.getByRole("link", { name: "Progress" }).click();
  // Oct 25: 1 of 3 = 33% (not kept at 60). Oct 24: full. Days so far Oct 5..26 = 22.
  await expect(page.getByTestId("tile-kept")).toHaveText("1");
});

test("an invalid number snaps back instead of saving", async ({ page }) => {
  await openAt(page, base());
  await page.getByTestId("threshold-field").fill("0");
  await page.getByTestId("threshold-field").press("Enter");
  await expect(page.getByTestId("threshold-field")).toHaveValue("80");
  expect((await readState(page)).arcs[0]!.threshold).toBe(80);
});

test("the habits editor adds, renames, reorders and removes with a same-day undo", async ({ page }) => {
  await openAt(page, base());
  await expect(page.getByTestId("habits-row")).toContainText("3 habits");
  await page.getByTestId("habits-row").click();
  const sheet = page.getByTestId("habits-sheet");
  await sheet.getByLabel("New habit name").fill("Walk");
  await sheet.getByLabel("New habit name").press("Enter");
  await expect(sheet.getByTestId("habit-edit-row")).toHaveCount(4);
  await sheet.getByLabel("Name of Gym").fill("Gym session");
  await sheet.getByLabel("Name of Gym").blur();
  await sheet.getByRole("button", { name: "Move Walk up" }).click();
  await sheet.getByRole("button", { name: "Remove Read" }).click();
  await expect(sheet.getByTestId("habit-edit-row")).toHaveCount(3);
  await expect(sheet.getByText("Read removed. Its tree stops growing.")).toBeVisible();
  await sheet.getByRole("button", { name: "Undo" }).click();
  await expect(sheet.getByTestId("habit-edit-row")).toHaveCount(4);
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Garden" }).click();
  await expect(page.getByTestId("habit-row")).toHaveText([/Read/, /Gym session/, /Walk/, /Meditation/]);
});

test("feel toggles persist; motion off stills the garden", async ({ page }) => {
  await openAt(page, base());
  for (const id of ["settings-haptics", "settings-sounds", "settings-motion"]) {
    await expect(page.getByTestId(id)).toHaveAttribute("aria-checked", "true");
    await page.getByTestId(id).click();
    await expect(page.getByTestId(id)).toHaveAttribute("aria-checked", "false");
  }
  await page.getByTestId("settings-nudge").click();
  await expect(page.getByText("Notifications arrive in the iPhone app.")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("settings-motion")).toHaveAttribute("aria-checked", "false");
  const s = await readState(page);
  expect(s.settings).toMatchObject({ haptics: false, sounds: false, motion: false, nudge: true });
  await page.getByRole("link", { name: "Garden" }).click();
  await expect(page.getByTestId("garden")).toHaveAttribute("data-motion", "off");
});

test("the scoring explainer opens", async ({ page }) => {
  await openAt(page, base());
  await page.getByTestId("scoring-row").click();
  const sheet = page.getByTestId("scoring-sheet");
  await expect(sheet).toContainText("A day at 80% or more");
  // SPEC 9, in plain words
  await expect(sheet).toContainText("up to the day before it was removed");
  await expect(sheet).toContainText("Each habit's rate");
  await expect(sheet).toContainText("share of days kept");
  await expect(sheet).toContainText("at least 7 days");
});

test("the start date saves on Enter, not on every change, and never ends a running arc", async ({ page }) => {
  await openAt(page, base());
  const start = page.getByTestId("start-field");
  await start.fill("2026-10-10");
  expect((await readState(page)).arcs[0]!.startDate).toBe("2026-10-01"); // still a draft
  await start.press("Enter");
  await expect.poll(async () => (await readState(page)).arcs[0]!.startDate).toBe("2026-10-10");
  // 90 days from 2026-07-01 ends 2026-09-28, before today: refused
  await start.fill("2026-07-01");
  await start.press("Enter");
  await expect(start).toHaveValue("2026-10-10");
  await expect(page.getByTestId("arc-complete")).toHaveCount(0);
  expect((await readState(page)).arcs[0]!.startDate).toBe("2026-10-10");
});

test("length cannot end a running arc before today", async ({ page }) => {
  await openAt(page, base()); // day 26
  await page.getByTestId("length-field").fill("20");
  await page.getByTestId("length-field").press("Enter");
  await expect(page.getByTestId("length-field")).toHaveValue("90");
  await expect(page.getByTestId("arc-complete")).toHaveCount(0);
  await page.getByTestId("length-field").fill("26");
  await page.getByTestId("length-field").press("Enter");
  await expect.poll(async () => (await readState(page)).arcs[0]!.lengthDays).toBe(26);
});

test("a finished arc shows its dates and threshold without editing them", async ({ page }) => {
  const s = base({ lengthDays: 14 }); // Oct 1 to Oct 14, finished
  s.ui.celebrated["arc:" + s.arcs[0]!.id] = true;
  await openAt(page, s);
  await expect(page.getByTestId("length-field")).toHaveCount(0);
  await expect(page.getByTestId("start-field")).toHaveCount(0);
  await expect(page.getByTestId("threshold-field")).toHaveCount(0);
  await expect(page.getByTestId("length-text")).toHaveText("14 days");
  await expect(page.getByTestId("start-text")).toHaveText("October 1, 2026");
  await expect(page.getByTestId("threshold-text")).toHaveText("80% is done");
});

test("lowering the threshold lets visitors join quietly, with no arrival toast", async ({ page }) => {
  // Only Read done each day: 33%, nothing kept at 80
  const days: Record<string, string[]> = {};
  for (let d = 1; d <= 25; d++) days[`2026-10-${String(d).padStart(2, "0")}`] = ["Read"];
  await openAt(page, withLogs(stateWithArc({ startDate: "2026-10-01" }), days));
  const before = (await readState(page)).visitors.length;
  await page.getByTestId("threshold-field").fill("30");
  await page.getByTestId("threshold-field").press("Enter");
  await expect.poll(async () => (await readState(page)).visitors.length).toBeGreaterThan(before);
  await page.waitForTimeout(300);
  await expect(page.getByText(/moved in|moving in|arrived/)).toHaveCount(0);
});

test("reset explains that removed habits go for good", async ({ page }) => {
  await openAt(page, base());
  await page.getByTestId("reset-arc").click();
  await expect(page.getByTestId("confirm-sheet")).toContainText("Habits you removed are deleted.");
});

test("clearing a habit name puts the old name back", async ({ page }) => {
  await openAt(page, base());
  await page.getByTestId("habits-row").click();
  const name = page.getByTestId("habits-sheet").getByLabel("Name of Gym");
  await name.fill("");
  await name.press("Enter");
  await expect(name).toHaveValue("Gym");
});

test("export, reset, then import brings everything back", async ({ page }) => {
  await openAt(page, base());
  const before = await readState(page);
  const dl = page.waitForEvent("download");
  await page.getByTestId("export").click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe("grove-backup-2026-10-26.json");
  const path = await file.path();
  const exported = JSON.parse(await readFile(path!, "utf8")) as AppState;
  expect(exported.logs).toEqual(before.logs);

  await page.getByTestId("reset-arc").click();
  await expect(page.getByTestId("confirm-sheet")).toContainText("starts again today");
  await page.getByTestId("confirm-yes").click();
  const reset = await readState(page);
  expect(reset.arcs[0]!.startDate).toBe(TODAY);
  expect(Object.values(reset.logs).every((l) => l.completedHabitIds.length === 0)).toBe(true);

  await page.getByTestId("import-file").setInputFiles(path!);
  await expect(page.getByTestId("confirm-sheet")).toContainText("1 arc (Winter Arc), 3 habits, 2 days logged");
  await page.getByTestId("confirm-yes").click();
  await expect(page.getByTestId("data-note")).toHaveText("Backup imported.");
  const after = await readState(page);
  expect(after.logs).toEqual(before.logs);
  expect(after.arcs[0]!.startDate).toBe("2026-10-01");
});

test("a v1 export imports as a Winter Arc; a broken file is refused", async ({ page }) => {
  await openAt(page, null);
  const v1 = {
    version: 1,
    settings: { startDate: "2026-10-05", lengthDays: 90, streakThreshold: 80, sleepTargetHours: 8 },
    habits: [{ id: "h1", name: "Read", category: "mind", order: 0, createdAt: "2026-10-05" }],
    logs: { "2026-10-06": { date: "2026-10-06", completedHabitIds: ["h1"] } },
    goals: [],
    ui: { lastCelebratedLevel: 1 },
  };
  await page.getByTestId("import-file").setInputFiles({ name: "old.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(v1)) });
  await page.getByTestId("confirm-yes").click();
  await page.getByRole("link", { name: "Garden" }).click();
  await expect(page.getByTestId("arc-name")).toHaveText("Winter Arc");
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByTestId("import-file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{oops") });
  await expect(page.getByTestId("data-note")).toHaveText("That file is not a Grove backup. Nothing changed.");
  await expect(page.getByTestId("confirm-sheet")).toHaveCount(0);
});

const LOOKS: Look[] = ["journal", "greenhouse", "night"];
const SEASONS: Season[] = ["winter", "summer"];
for (const look of LOOKS) {
  for (const season of SEASONS) {
    test(`phase 6 screenshots: ${look}, ${season}`, async ({ page }) => {
      await openAt(page, base({ look, season }));
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${SHOTS}/p6-settings-${look}-${season}-top.png` });
      await page.getByTestId("reset-arc").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOTS}/p6-settings-${look}-${season}-bottom.png` });
      await page.getByTestId("scoring-row").click();
      await page.screenshot({ path: `${SHOTS}/p6-scoring-${look}-${season}.png` });
    });
  }
}
