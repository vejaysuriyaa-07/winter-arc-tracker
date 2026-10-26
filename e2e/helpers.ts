import type { Page } from "@playwright/test";
import type { AppState } from "../src/types";
import { STORAGE_KEY, defaultState } from "../src/lib/storage";
import { todayLocal } from "../src/lib/dates";

export { STORAGE_KEY, defaultState, todayLocal };

/** Put a state into localStorage before the app loads. */
export async function seed(page: Page, state: AppState): Promise<void> {
  await page.addInitScript(
    ([key, json]) => {
      window.localStorage.setItem(key as string, json as string);
    },
    [STORAGE_KEY, JSON.stringify(state)],
  );
}

export async function readState(page: Page): Promise<AppState> {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  if (raw === null) throw new Error("no state stored");
  return JSON.parse(raw) as AppState;
}

export const SHOTS = "e2e/screenshots";
