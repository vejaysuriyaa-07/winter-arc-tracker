// Phase 7: sign in with an email code, sync status, push, pull, offline, retry.
// Every request goes to the fake server in fakeSupabase.ts.
import { expect, test, type Page } from "@playwright/test";
import { EMAIL, FakeSupabase, GOOD_CODE, USER_ID } from "./fakeSupabase";
import { SHOTS, noonLA, readState, seed, stateWithArc, withLogs } from "./helpers";
import type { AppState, Look, Season } from "../src/types";

const TODAY = "2026-10-26";

function base(extra: Partial<Parameters<typeof stateWithArc>[0]> = {}): AppState {
  return withLogs(stateWithArc({ startDate: "2026-10-01", ...extra }), { "2026-10-24": ["Read", "Gym", "Meditation"], "2026-10-25": ["Read"] });
}

async function open(page: Page, state: AppState, path = "#/settings"): Promise<FakeSupabase> {
  await page.clock.setFixedTime(noonLA(TODAY));
  const server = new FakeSupabase(noonLA(TODAY).getTime());
  await server.install(page);
  await seed(page, state);
  await page.goto(path);
  return server;
}

async function signIn(page: Page): Promise<void> {
  await page.goto("#/signin");
  await page.getByTestId("signin-email").fill(EMAIL);
  await page.getByTestId("send-code").click();
  await expect(page.getByTestId("signin-note")).toHaveText(`We sent a 6-digit code to ${EMAIL}.`);
  await page.getByTestId("signin-code").fill(GOOD_CODE);
  await page.getByTestId("verify-code").click();
  await expect(page).toHaveURL(/#\/settings$/);
}

test("signing in uploads this device's gardens and shows Synced just now", async ({ page }) => {
  const server = await open(page, base());
  await expect(page.getByTestId("signin-row")).toContainText("Sign in to sync");
  await page.getByTestId("signin-row").click();
  await expect(page).toHaveURL(/#\/signin$/);
  await signIn(page);
  await expect(page.getByTestId("sync-account")).toContainText(EMAIL);
  await expect(page.getByTestId("sync-status")).toContainText("Synced just now");
  const local = await readState(page);
  expect(server.rows("arcs")).toEqual([expect.objectContaining({ id: local.arcs[0]!.id, user_id: USER_ID, name: "Winter Arc", start_date: "2026-10-01" })]);
  expect(server.rows("habits")).toHaveLength(3);
  expect(server.rows("day_logs").length).toBe(Object.keys(local.logs).length);
  expect(local.sync.queue).toEqual([]);
});

test("a check-off after sign in reaches the server on its own", async ({ page }) => {
  const server = await open(page, base());
  await signIn(page);
  await expect(page.getByTestId("sync-status")).toContainText("Synced just now");
  await page.getByRole("link", { name: "Garden" }).click();
  await page.getByRole("checkbox", { name: /Gym/ }).click();
  await expect.poll(() => server.rows("day_logs").find((r) => r.date === TODAY)?.completed_habit_ids, { timeout: 8000 }).toHaveLength(1);
});

test("too many codes gets the friendly line", async ({ page }) => {
  const server = await open(page, base(), "#/signin");
  server.otp = "rate-limit";
  await page.getByTestId("signin-email").fill(EMAIL);
  await page.getByTestId("send-code").click();
  await expect(page.getByTestId("signin-error")).toHaveText("Too many codes sent. Try again in a bit.");
});

test("a wrong code says so and keeps you on the code step", async ({ page }) => {
  await open(page, base(), "#/signin");
  await page.getByTestId("signin-email").fill(EMAIL);
  await page.getByTestId("send-code").click();
  await page.getByTestId("signin-code").fill("000000");
  await page.getByTestId("verify-code").click();
  await expect(page.getByTestId("signin-error")).toHaveText("That code did not work. Check it or send a new one.");
  await expect(page.getByTestId("signin-code")).toBeVisible();
});

test("offline: changes wait, then sync when the network returns", async ({ page, context }) => {
  const server = await open(page, base());
  await signIn(page);
  await expect(page.getByTestId("sync-status")).toContainText("Synced just now");
  await context.setOffline(true);
  await page.getByRole("link", { name: "Garden" }).click();
  await page.getByRole("checkbox", { name: /Meditation/ }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByTestId("sync-status")).toContainText("Offline, will sync later", { timeout: 8000 });
  expect((await readState(page)).sync.queue.length).toBeGreaterThan(0);
  await context.setOffline(false);
  await expect(page.getByTestId("sync-status")).toContainText("Synced just now", { timeout: 8000 });
  expect(server.rows("day_logs").find((r) => r.date === TODAY)?.completed_habit_ids).toHaveLength(1);
});

test("a server failure offers a retry that works", async ({ page }) => {
  const server = await open(page, base());
  server.failRest = true;
  await signIn(page);
  await expect(page.getByTestId("sync-status")).toContainText("Sync failed, tap to retry");
  server.failRest = false;
  await page.getByTestId("sync-status").click();
  await expect(page.getByTestId("sync-status")).toContainText("Synced just now");
  expect(server.rows("arcs")).toHaveLength(1);
});

test("an arc from another device arrives, quietly, and becomes browsable", async ({ page }) => {
  const server = await open(page, base());
  server.write("arcs", { id: "0a0a0a0a-0000-4000-8000-000000000001", user_id: USER_ID, name: "Spring Run", season: "spring", look: "greenhouse", start_date: "2026-10-20", length_days: 30, threshold: 80, created_at: "2026-10-20T10:00:00+00:00", frozen_at: null, updated_at: "2026-10-20T10:00:00+00:00", deleted: false });
  server.write("habits", { id: "0a0a0a0a-0000-4000-8000-000000000002", user_id: USER_ID, arc_id: "0a0a0a0a-0000-4000-8000-000000000001", name: "Run", detail: null, sort_order: 0, created_on: "2026-10-20", archived_on: null, updated_at: "2026-10-20T10:00:00+00:00", deleted: false });
  await signIn(page);
  await expect(page.getByTestId("sync-status")).toContainText("Synced just now");
  await page.getByRole("link", { name: "Arcs" }).click();
  await expect(page.getByText("Spring Run")).toBeVisible();
  await expect(page.getByText(/moved in/)).toHaveCount(0);
  const s = await readState(page);
  expect(s.habits.find((h) => h.name === "Run")?.arcId).toBe("0a0a0a0a-0000-4000-8000-000000000001");
});

test("the session survives a reload; signing out keeps the data here", async ({ page }) => {
  await open(page, base());
  await signIn(page);
  await expect(page.getByTestId("sync-status")).toContainText("Synced just now");
  await page.reload();
  await expect(page.getByTestId("sync-account")).toContainText(EMAIL);
  const before = await readState(page);
  await page.getByTestId("sign-out").click();
  await expect(page.getByTestId("signin-row")).toBeVisible();
  const after = await readState(page);
  expect(after.arcs).toEqual(before.arcs);
  expect(after.logs).toEqual(before.logs);
});

test("signing in as a different account never uploads the last account's gardens", async ({ page }) => {
  await page.addInitScript(() => {
    if (window.localStorage.getItem("grove:sync-user") === null) window.localStorage.setItem("grove:sync-user", "11111111-1111-4111-8111-111111111111");
  });
  const server = await open(page, base());
  await signIn(page);
  await expect(page.getByTestId("sync-status")).toContainText("Synced just now");
  expect(server.rows("arcs")).toEqual([]);
  expect(server.rows("day_logs")).toEqual([]);
  const s = await readState(page);
  expect(s.arcs).toEqual([]);
  const backups = await page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.startsWith("grove:backup:account:")));
  expect(backups).toHaveLength(1);
});

test("the sign-in card shows once after the first full day", async ({ page }) => {
  await open(page, base(), "#/");
  await expect(page.getByTestId("signin-prompt")).toBeVisible();
  await page.getByTestId("signin-prompt").getByRole("button", { name: "Maybe later" }).click();
  await expect(page.getByTestId("signin-prompt")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("garden")).toBeVisible();
  await expect(page.getByTestId("signin-prompt")).toHaveCount(0);
});

test("no sign-in card before any full day", async ({ page }) => {
  await open(page, withLogs(stateWithArc({ startDate: "2026-10-01" }), { "2026-10-25": ["Read"] }), "#/");
  await expect(page.getByTestId("garden")).toBeVisible();
  await expect(page.getByTestId("signin-prompt")).toHaveCount(0);
});

const LOOKS: Look[] = ["journal", "greenhouse", "night"];
const SEASONS: Season[] = ["winter", "summer"];
for (const look of LOOKS) {
  for (const season of SEASONS) {
    test(`phase 7 screenshots: ${look}, ${season}`, async ({ page }) => {
      const server = await open(page, base({ look, season }), "#/");
      await page.evaluate(() => document.fonts.ready);
      await page.getByTestId("signin-prompt").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOTS}/p7-prompt-${look}-${season}.png` });
      await page.goto("#/signin");
      await page.getByTestId("signin-email").fill(EMAIL);
      await page.screenshot({ path: `${SHOTS}/p7-signin-${look}-${season}.png` });
      server.otp = "rate-limit";
      await page.getByTestId("send-code").click();
      await expect(page.getByTestId("signin-error")).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/p7-signin-error-${look}-${season}.png` });
      server.otp = "ok";
      await page.getByTestId("send-code").click();
      await page.getByTestId("signin-code").fill("123");
      await page.screenshot({ path: `${SHOTS}/p7-code-${look}-${season}.png` });
      await page.getByTestId("signin-code").fill(GOOD_CODE);
      await page.getByTestId("verify-code").click();
      await expect(page.getByTestId("sync-status")).toContainText("Synced just now");
      await page.getByTestId("sync-status").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOTS}/p7-settings-sync-${look}-${season}.png` });
    });
  }
}
