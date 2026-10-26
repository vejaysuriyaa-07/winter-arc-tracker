// The only module that touches localStorage.
import { CATEGORIES } from "../types";
import type { AppState, ArcSettings, Category, DayLog, Goal, Habit, Rating } from "../types";
import { isValidYMD, type YMD } from "./dates";

export const STORAGE_KEY = "winter-arc:v1";
/** Where unreadable stored data is parked before defaults replace it. */
export const BACKUP_KEY = "winter-arc:v1:backup";

export type HabitSeed = { name: string; detail?: string; category: Category };

export const DEFAULT_HABITS: readonly HabitSeed[] = [
  { name: "Wake up at 5 AM", category: "morning" },
  { name: "Meditation", category: "mind" },
  { name: "Gym", category: "body" },
  { name: "Read", detail: "10 pages", category: "mind" },
  { name: "Eat healthy", category: "body" },
  { name: "Plan next day", category: "discipline" },
  { name: "Journaling", category: "mind" },
  { name: "Cold shower", category: "body" },
  { name: "No social media", category: "discipline" },
];

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultSettings(today: YMD): ArcSettings {
  return { startDate: today, lengthDays: 90, streakThreshold: 80, sleepTargetHours: 8 };
}

export function defaultState(today: YMD): AppState {
  const habits: Habit[] = DEFAULT_HABITS.map((seed, order) => {
    const h: Habit = { id: newId(), name: seed.name, category: seed.category, order, createdAt: today };
    if (seed.detail !== undefined) h.detail = seed.detail;
    return h;
  });
  return {
    version: 1,
    settings: defaultSettings(today),
    habits,
    logs: {},
    goals: [],
    ui: { lastCelebratedLevel: 1 },
  };
}

// ---------- validation ----------

export type Validation = { ok: true; state: AppState } | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isStr(v: unknown): v is string {
  return typeof v === "string";
}
function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isRating(v: unknown): v is Rating {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5;
}
function isCategory(v: unknown): v is Category {
  return isStr(v) && (CATEGORIES as readonly string[]).includes(v);
}

function fail(error: string): Validation {
  return { ok: false, error };
}

function validateHabit(v: unknown, i: number): Habit | string {
  if (!isRecord(v)) return `habits[${i}] is not an object`;
  if (!isStr(v.id) || v.id === "") return `habits[${i}].id is missing`;
  if (!isStr(v.name)) return `habits[${i}].name is missing`;
  if (v.detail !== undefined && !isStr(v.detail)) return `habits[${i}].detail is not text`;
  if (!isCategory(v.category)) return `habits[${i}].category is not a known category`;
  if (!isFiniteNum(v.order)) return `habits[${i}].order is not a number`;
  if (!isValidYMD(v.createdAt)) return `habits[${i}].createdAt is not a YYYY-MM-DD day`;
  if (v.archivedAt !== undefined && !isValidYMD(v.archivedAt))
    return `habits[${i}].archivedAt is not a YYYY-MM-DD day`;
  const h: Habit = { id: v.id, name: v.name, category: v.category, order: v.order, createdAt: v.createdAt };
  if (v.detail !== undefined) h.detail = v.detail;
  if (v.archivedAt !== undefined) h.archivedAt = v.archivedAt;
  return h;
}

function validateLog(key: string, v: unknown): DayLog | string {
  if (!isValidYMD(key)) return `logs key "${key}" is not a YYYY-MM-DD day`;
  if (!isRecord(v)) return `logs["${key}"] is not an object`;
  if (v.date !== key) return `logs["${key}"].date does not match its key`;
  if (!Array.isArray(v.completedHabitIds) || !v.completedHabitIds.every(isStr))
    return `logs["${key}"].completedHabitIds is not a list of ids`;
  if (v.mood !== undefined && !isRating(v.mood)) return `logs["${key}"].mood is not 1-5`;
  if (v.sleepHours !== undefined && (!isFiniteNum(v.sleepHours) || v.sleepHours < 0))
    return `logs["${key}"].sleepHours is not a non-negative number`;
  if (v.sleepQuality !== undefined && !isRating(v.sleepQuality)) return `logs["${key}"].sleepQuality is not 1-5`;
  if (v.journalWin !== undefined && !isStr(v.journalWin)) return `logs["${key}"].journalWin is not text`;
  const log: DayLog = { date: key, completedHabitIds: [...v.completedHabitIds] };
  if (v.mood !== undefined) log.mood = v.mood;
  if (v.sleepHours !== undefined) log.sleepHours = v.sleepHours;
  if (v.sleepQuality !== undefined) log.sleepQuality = v.sleepQuality;
  if (v.journalWin !== undefined) log.journalWin = v.journalWin;
  return log;
}

function validateGoal(v: unknown, i: number): Goal | string {
  if (!isRecord(v)) return `goals[${i}] is not an object`;
  if (!isStr(v.id) || v.id === "") return `goals[${i}].id is missing`;
  if (!isStr(v.name)) return `goals[${i}].name is missing`;
  if (!isFiniteNum(v.target) || v.target < 0) return `goals[${i}].target is not a non-negative number`;
  if (!isFiniteNum(v.current) || v.current < 0) return `goals[${i}].current is not a non-negative number`;
  if (!isValidYMD(v.createdAt)) return `goals[${i}].createdAt is not a YYYY-MM-DD day`;
  return { id: v.id, name: v.name, target: v.target, current: v.current, createdAt: v.createdAt };
}

function validateSettings(v: unknown): ArcSettings | string {
  if (!isRecord(v)) return "settings is missing";
  if (!isValidYMD(v.startDate)) return "settings.startDate is not a YYYY-MM-DD day";
  if (!isFiniteNum(v.lengthDays) || v.lengthDays < 1 || !Number.isInteger(v.lengthDays))
    return "settings.lengthDays must be a whole number of at least 1";
  if (!isFiniteNum(v.streakThreshold) || v.streakThreshold < 0 || v.streakThreshold > 100)
    return "settings.streakThreshold must be 0-100";
  if (!isFiniteNum(v.sleepTargetHours) || v.sleepTargetHours <= 0)
    return "settings.sleepTargetHours must be above 0";
  return {
    startDate: v.startDate,
    lengthDays: v.lengthDays,
    streakThreshold: v.streakThreshold,
    sleepTargetHours: v.sleepTargetHours,
  };
}

function validateV1(v: Record<string, unknown>): Validation {
  const settings = validateSettings(v.settings);
  if (isStr(settings)) return fail(settings);

  if (!Array.isArray(v.habits)) return fail("habits is not a list");
  const habits: Habit[] = [];
  for (const [i, h] of v.habits.entries()) {
    const r = validateHabit(h, i);
    if (isStr(r)) return fail(r);
    habits.push(r);
  }

  if (!isRecord(v.logs)) return fail("logs is not an object");
  const logs: Record<string, DayLog> = {};
  for (const [key, l] of Object.entries(v.logs)) {
    const r = validateLog(key, l);
    if (isStr(r)) return fail(r);
    logs[key] = r;
  }

  if (!Array.isArray(v.goals)) return fail("goals is not a list");
  const goals: Goal[] = [];
  for (const [i, g] of v.goals.entries()) {
    const r = validateGoal(g, i);
    if (isStr(r)) return fail(r);
    goals.push(r);
  }

  if (!isRecord(v.ui) || !isFiniteNum(v.ui.lastCelebratedLevel) || v.ui.lastCelebratedLevel < 1)
    return fail("ui.lastCelebratedLevel must be a number of at least 1");

  return {
    ok: true,
    state: { version: 1, settings, habits, logs, goals, ui: { lastCelebratedLevel: v.ui.lastCelebratedLevel } },
  };
}

/** Validates an unknown value as AppState, migrating older versions when they exist. */
export function validateState(input: unknown): Validation {
  if (!isRecord(input)) return fail("Not a Winter Arc export (expected an object)");
  if (input.version === 1) return validateV1(input);
  return fail(`Unsupported data version: ${String(input.version)}`);
}

// ---------- persistence ----------

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function load(today: YMD): AppState {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (raw === null || raw === undefined) return defaultState(today);
  const r = parseImport(raw);
  if (r.ok) return r.state;
  storage()?.setItem(BACKUP_KEY, raw);
  return defaultState(today);
}

export function save(state: AppState): void {
  storage()?.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- export / import ----------

export function serialize(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImport(text: string): Validation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail("The file is not valid JSON");
  }
  return validateState(parsed);
}
