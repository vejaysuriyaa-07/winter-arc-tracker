import type { Page } from "@playwright/test";
import type { AppState } from "../src/types";
import { STORAGE_KEY, V1_KEY, BACKUP_V1_KEY, defaultState } from "../src/lib/storage";
import { createArc, type NewArc } from "../src/lib/mutations";

export { STORAGE_KEY, V1_KEY, BACKUP_V1_KEY };

const T = "2026-10-01T00:00:00.000Z";

/** A state with one arc (and habits) built through the real mutations. */
export function stateWithArc(input: Partial<NewArc> & { startDate: string }): AppState {
  return createArc(defaultState(T), T, {
    name: "Winter Arc",
    season: "winter",
    look: "journal",
    lengthDays: 90,
    habits: [{ name: "Read", detail: "10 pages" }, { name: "Gym" }, { name: "Meditation" }],
    ...input,
  });
}

/** Put a raw value under a key before the app first loads. Reloads keep what the app saved since. */
export async function seedRaw(page: Page, key: string, json: string): Promise<void> {
  await page.addInitScript(
    ([k, v]) => {
      if (window.localStorage.getItem(k as string) === null) window.localStorage.setItem(k as string, v as string);
    },
    [key, json],
  );
}

export async function seed(page: Page, state: AppState): Promise<void> {
  await seedRaw(page, STORAGE_KEY, JSON.stringify(state));
}

export async function readState(page: Page): Promise<AppState> {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  if (raw === null) throw new Error("no state stored");
  return JSON.parse(raw) as AppState;
}

export const SHOTS = "e2e/screenshots";
