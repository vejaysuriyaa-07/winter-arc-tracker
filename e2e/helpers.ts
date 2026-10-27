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

/** Adds check-offs by habit name: { "2026-10-20": ["Read", "Gym"] }. Moods optional. */
export function withLogs(
  state: AppState,
  days: Record<string, string[]>,
  moods: Record<string, AppState["logs"][string]["mood"]> = {},
): AppState {
  const arc = state.arcs[0]!;
  const byName = new Map(state.habits.map((h) => [h.name, h.id]));
  const logs = { ...state.logs };
  for (const date of new Set([...Object.keys(days), ...Object.keys(moods)])) {
    const ids = (days[date] ?? []).map((n) => {
      const id = byName.get(n);
      if (!id) throw new Error(`no habit ${n}`);
      return id;
    });
    const log: AppState["logs"][string] = { id: `00000000-0000-4000-a000-${date.replace(/-/g, "").padStart(12, "0")}`, arcId: arc.id, date, completedHabitIds: ids, updatedAt: T };
    const mood = moods[date];
    if (mood) log.mood = mood;
    logs[`${arc.id}:${date}`] = log;
  }
  return { ...state, logs };
}

/** Local noon in Los Angeles on a calendar day (the e2e browser runs in that zone). */
export function noonLA(ymd: string): Date {
  return new Date(`${ymd}T12:00:00-07:00`);
}

/** Gives the first arc a fixed id (rare-visitor rolls are seeded by arc id, so tests can pin them). */
export function withArcId(state: AppState, id: string): AppState {
  const old = state.arcs[0]!.id;
  const swap = (x: string): string => (x === old ? id : x);
  const logs: AppState["logs"] = {};
  for (const l of Object.values(state.logs)) logs[`${swap(l.arcId)}:${l.date}`] = { ...l, arcId: swap(l.arcId) };
  return {
    ...state,
    arcs: state.arcs.map((a) => ({ ...a, id: swap(a.id) })),
    activeArcId: state.activeArcId === old ? id : state.activeArcId,
    habits: state.habits.map((h) => ({ ...h, arcId: swap(h.arcId) })),
    logs,
    visitors: state.visitors.map((v) => ({ ...v, arcId: swap(v.arcId) })),
    sync: { queue: state.sync.queue.map((q) => ({ ...q, id: swap(q.id) })) },
  };
}
