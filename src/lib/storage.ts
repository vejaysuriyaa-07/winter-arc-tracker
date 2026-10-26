// The only module that touches persistent storage. A StorageAdapter hides where
// the bytes live: localStorage on the web, Capacitor Preferences on iOS.
import { LOOKS, MOODS, SEASONS, SYNC_TABLES, logKey } from "../types";
import type { AppState, Arc, DayLog, Habit, Look, Mood, Season, Settings, SyncOp, SyncTable, UiState, VisitorFound } from "../types";
import { isValidYMD, type YMD } from "./dates";
import { migrateV1, type V1State } from "./migrate";
import { markFinishedCelebrated } from "./arcs";

export const STORAGE_KEY = "grove:v3";
/** The old Winter Arc Tracker key; read once, migrated, then parked. */
export const V1_KEY = "winter-arc:v1";
/** Raw v1 data, written once on first migration and never touched again. */
export const BACKUP_V1_KEY = "grove:backup:v1";
/** Prefix for unreadable stored data parked before defaults replace it; suffixed with the time. */
export const BACKUP_UNREADABLE_KEY = "grove:backup:unreadable";

export type StorageAdapter = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

export function memoryAdapter(initial: Record<string, string> = {}): StorageAdapter {
  const m = new Map(Object.entries(initial));
  return {
    get: async (k) => m.get(k) ?? null,
    set: async (k, v) => {
      m.set(k, v);
    },
    remove: async (k) => {
      m.delete(k);
    },
  };
}

export function webAdapter(): StorageAdapter {
  const ls = (): Storage => {
    const s = globalThis.localStorage;
    if (!s) throw new Error("localStorage unavailable");
    return s;
  };
  return {
    get: async (k) => ls().getItem(k),
    set: async (k, v) => {
      ls().setItem(k, v);
    },
    remove: async (k) => {
      ls().removeItem(k);
    },
  };
}

export function defaultSettings(now: string): Settings {
  return { autoNight: true, haptics: true, sounds: true, motion: true, nudge: false, recap: false, updatedAt: now };
}

export function defaultState(now: string): AppState {
  return {
    version: 3,
    arcs: [],
    activeArcId: null,
    habits: [],
    logs: {},
    visitors: [],
    settings: defaultSettings(now),
    ui: { celebrated: {}, recapSeen: [], signInPrompted: false, notificationsPrompted: false },
    sync: { queue: [] },
  };
}

// ---------- validation ----------

export type Validation = { ok: true; state: AppState } | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const isStr = (v: unknown): v is string => typeof v === "string";
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isInt = (v: unknown): v is number => isNum(v) && Number.isInteger(v);
const isId = (v: unknown): v is string => isStr(v) && v !== "";
const isIso = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));
const isSeason = (v: unknown): v is Season => isStr(v) && (SEASONS as readonly string[]).includes(v);
const isLook = (v: unknown): v is Look => isStr(v) && (LOOKS as readonly string[]).includes(v);
const isMood = (v: unknown): v is Mood => isStr(v) && (MOODS as readonly string[]).includes(v);
const isTable = (v: unknown): v is SyncTable => isStr(v) && (SYNC_TABLES as readonly string[]).includes(v);

const fail = (error: string): Validation => ({ ok: false, error });

function validateArc(v: unknown, i: number): Arc | string {
  const p = `arcs[${i}]`;
  if (!isRecord(v)) return `${p} is not an object`;
  if (!isId(v.id)) return `${p}.id is missing`;
  if (!isStr(v.name)) return `${p}.name is missing`;
  if (!isSeason(v.season)) return `${p}.season is not a season`;
  if (!isLook(v.look)) return `${p}.look is not a look`;
  if (!isValidYMD(v.startDate)) return `${p}.startDate is not a YYYY-MM-DD day`;
  if (!isInt(v.lengthDays) || v.lengthDays < 1) return `${p}.lengthDays must be a whole number of at least 1`;
  if (!isNum(v.threshold) || v.threshold < 0 || v.threshold > 100) return `${p}.threshold must be 0-100`;
  if (!isIso(v.createdAt)) return `${p}.createdAt is not a timestamp`;
  if (!isIso(v.updatedAt)) return `${p}.updatedAt is not a timestamp`;
  if (v.frozenAt !== undefined && !isIso(v.frozenAt)) return `${p}.frozenAt is not a timestamp`;
  if (v.deleted !== undefined && !isBool(v.deleted)) return `${p}.deleted is not true or false`;
  const a: Arc = {
    id: v.id, name: v.name, season: v.season, look: v.look, startDate: v.startDate, lengthDays: v.lengthDays,
    threshold: v.threshold, createdAt: v.createdAt, updatedAt: v.updatedAt,
  };
  if (v.frozenAt !== undefined) a.frozenAt = v.frozenAt;
  if (v.deleted !== undefined) a.deleted = v.deleted;
  return a;
}

function validateHabit(v: unknown, i: number, arcIds: ReadonlySet<string>): Habit | string {
  const p = `habits[${i}]`;
  if (!isRecord(v)) return `${p} is not an object`;
  if (!isId(v.id)) return `${p}.id is missing`;
  if (!isId(v.arcId) || !arcIds.has(v.arcId)) return `${p}.arcId is not a known arc`;
  if (!isStr(v.name)) return `${p}.name is missing`;
  if (v.detail !== undefined && !isStr(v.detail)) return `${p}.detail is not text`;
  if (!isInt(v.order)) return `${p}.order is not a whole number`;
  if (!isValidYMD(v.createdAt)) return `${p}.createdAt is not a YYYY-MM-DD day`;
  if (v.archivedAt !== undefined && !isValidYMD(v.archivedAt)) return `${p}.archivedAt is not a YYYY-MM-DD day`;
  if (v.archivedAt !== undefined && v.archivedAt < v.createdAt) return `${p}.archivedAt is before its createdAt`;
  if (!isIso(v.updatedAt)) return `${p}.updatedAt is not a timestamp`;
  if (v.deleted !== undefined && !isBool(v.deleted)) return `${p}.deleted is not true or false`;
  const h: Habit = { id: v.id, arcId: v.arcId, name: v.name, order: v.order, createdAt: v.createdAt, updatedAt: v.updatedAt };
  if (v.detail !== undefined) h.detail = v.detail;
  if (v.archivedAt !== undefined) h.archivedAt = v.archivedAt;
  if (v.deleted !== undefined) h.deleted = v.deleted;
  return h;
}

function validateLog(key: string, v: unknown, arcIds: ReadonlySet<string>, habitIds: ReadonlySet<string>): DayLog | string {
  const p = `logs["${key}"]`;
  if (!isRecord(v)) return `${p} is not an object`;
  if (!isId(v.id)) return `${p}.id is missing`;
  if (!isId(v.arcId) || !arcIds.has(v.arcId)) return `${p}.arcId is not a known arc`;
  if (!isValidYMD(v.date)) return `${p}.date is not a YYYY-MM-DD day`;
  if (logKey(v.arcId, v.date) !== key) return `${p} does not match its key`;
  if (!Array.isArray(v.completedHabitIds) || !v.completedHabitIds.every(isStr)) return `${p}.completedHabitIds is not a list of ids`;
  if (v.mood !== undefined && !isMood(v.mood)) return `${p}.mood is not a mood`;
  if (!isIso(v.updatedAt)) return `${p}.updatedAt is not a timestamp`;
  // Check-offs of habits that no longer exist are meaningless: drop them, keep the rest.
  const l: DayLog = {
    id: v.id, arcId: v.arcId, date: v.date,
    completedHabitIds: v.completedHabitIds.filter((id) => habitIds.has(id)),
    updatedAt: v.updatedAt,
  };
  if (v.mood !== undefined) l.mood = v.mood;
  return l;
}

function validateVisitor(v: unknown, i: number, arcIds: ReadonlySet<string>): VisitorFound | string {
  const p = `visitors[${i}]`;
  if (!isRecord(v)) return `${p} is not an object`;
  if (!isId(v.id)) return `${p}.id is missing`;
  if (!isId(v.arcId) || !arcIds.has(v.arcId)) return `${p}.arcId is not a known arc`;
  if (!isId(v.visitorId)) return `${p}.visitorId is missing`;
  if (!isValidYMD(v.foundOn)) return `${p}.foundOn is not a YYYY-MM-DD day`;
  if (!isIso(v.updatedAt)) return `${p}.updatedAt is not a timestamp`;
  return { id: v.id, arcId: v.arcId, visitorId: v.visitorId, foundOn: v.foundOn, updatedAt: v.updatedAt };
}

function validateSettings(v: unknown): Settings | string {
  if (!isRecord(v)) return "settings is missing";
  for (const k of ["autoNight", "haptics", "sounds", "motion", "nudge", "recap"] as const) {
    if (!isBool(v[k])) return `settings.${k} is not true or false`;
  }
  if (!isIso(v.updatedAt)) return "settings.updatedAt is not a timestamp";
  return {
    autoNight: v.autoNight as boolean, haptics: v.haptics as boolean, sounds: v.sounds as boolean,
    motion: v.motion as boolean, nudge: v.nudge as boolean, recap: v.recap as boolean, updatedAt: v.updatedAt,
  };
}

function validateUi(v: unknown): UiState | string {
  if (!isRecord(v)) return "ui is missing";
  if (!isRecord(v.celebrated) || !Object.values(v.celebrated).every(isBool)) return "ui.celebrated is not a map of flags";
  if (!Array.isArray(v.recapSeen) || !v.recapSeen.every(isStr)) return "ui.recapSeen is not a list";
  if (!isBool(v.signInPrompted)) return "ui.signInPrompted is not true or false";
  if (!isBool(v.notificationsPrompted)) return "ui.notificationsPrompted is not true or false";
  return {
    celebrated: { ...(v.celebrated as Record<string, boolean>) },
    recapSeen: [...v.recapSeen],
    signInPrompted: v.signInPrompted,
    notificationsPrompted: v.notificationsPrompted,
  };
}

function validateSync(v: unknown): AppState["sync"] | string {
  if (!isRecord(v)) return "sync is missing";
  if (v.lastPulledAt !== undefined && !isIso(v.lastPulledAt)) return "sync.lastPulledAt is not a timestamp";
  if (!Array.isArray(v.queue)) return "sync.queue is not a list";
  const queue: SyncOp[] = [];
  for (const [i, op] of v.queue.entries()) {
    if (!isRecord(op) || !isTable(op.table) || !isId(op.id) || !isIso(op.at)) return `sync.queue[${i}] is not a sync op`;
    queue.push({ table: op.table, id: op.id, at: op.at });
  }
  const out: AppState["sync"] = { queue };
  if (v.lastPulledAt !== undefined) out.lastPulledAt = v.lastPulledAt;
  return out;
}

function validateV3(v: Record<string, unknown>): Validation {
  if (!Array.isArray(v.arcs)) return fail("arcs is not a list");
  const arcs: Arc[] = [];
  const arcIds = new Set<string>();
  for (const [i, a] of v.arcs.entries()) {
    const r = validateArc(a, i);
    if (isStr(r)) return fail(r);
    if (arcIds.has(r.id)) return fail(`arcs[${i}].id "${r.id}" is a duplicate`);
    arcIds.add(r.id);
    arcs.push(r);
  }
  if (v.activeArcId !== null && (!isId(v.activeArcId) || !arcIds.has(v.activeArcId))) return fail("activeArcId is not a known arc");

  if (!Array.isArray(v.habits)) return fail("habits is not a list");
  const habits: Habit[] = [];
  const habitIds = new Set<string>();
  for (const [i, h] of v.habits.entries()) {
    const r = validateHabit(h, i, arcIds);
    if (isStr(r)) return fail(r);
    if (habitIds.has(r.id)) return fail(`habits[${i}].id "${r.id}" is a duplicate`);
    habitIds.add(r.id);
    habits.push(r);
  }

  if (!isRecord(v.logs)) return fail("logs is not an object");
  const logs: Record<string, DayLog> = {};
  for (const [key, l] of Object.entries(v.logs)) {
    const r = validateLog(key, l, arcIds, habitIds);
    if (isStr(r)) return fail(r);
    logs[key] = r;
  }

  if (!Array.isArray(v.visitors)) return fail("visitors is not a list");
  const visitors: VisitorFound[] = [];
  for (const [i, x] of v.visitors.entries()) {
    const r = validateVisitor(x, i, arcIds);
    if (isStr(r)) return fail(r);
    visitors.push(r);
  }

  const settings = validateSettings(v.settings);
  if (isStr(settings)) return fail(settings);
  const ui = validateUi(v.ui);
  if (isStr(ui)) return fail(ui);
  const sync = validateSync(v.sync);
  if (isStr(sync)) return fail(sync);

  return { ok: true, state: { version: 3, arcs, activeArcId: v.activeArcId as string | null, habits, logs, visitors, settings, ui, sync } };
}

// Minimal v1 check: enough to migrate safely. Unknown fields (goals, sleep) are ignored.
function validateV1(v: Record<string, unknown>): V1State | string {
  const s = v.settings;
  if (!isRecord(s) || !isValidYMD(s.startDate) || !isInt(s.lengthDays) || s.lengthDays < 1 || !isNum(s.streakThreshold))
    return "settings are not a Winter Arc setup";
  if (!Array.isArray(v.habits)) return "habits is not a list";
  const habits: V1State["habits"] = [];
  const ids = new Set<string>();
  for (const [i, h] of v.habits.entries()) {
    if (!isRecord(h) || !isId(h.id) || !isStr(h.name) || !isInt(h.order) || !isValidYMD(h.createdAt)) return `habits[${i}] is not a habit`;
    if (h.archivedAt !== undefined && (!isValidYMD(h.archivedAt) || h.archivedAt < h.createdAt)) return `habits[${i}].archivedAt is invalid`;
    if (ids.has(h.id)) return `habits[${i}].id is a duplicate`;
    ids.add(h.id);
    const out: V1State["habits"][number] = { id: h.id, name: h.name, order: h.order, createdAt: h.createdAt };
    if (isStr(h.detail)) out.detail = h.detail;
    if (h.archivedAt !== undefined) out.archivedAt = h.archivedAt as string;
    habits.push(out);
  }
  if (!isRecord(v.logs)) return "logs is not an object";
  const logs: V1State["logs"] = {};
  for (const [key, l] of Object.entries(v.logs)) {
    if (!isValidYMD(key) || !isRecord(l) || !Array.isArray(l.completedHabitIds)) return `logs["${key}"] is not a day log`;
    const out: V1State["logs"][string] = { date: key, completedHabitIds: l.completedHabitIds.filter(isStr).filter((id) => ids.has(id)) };
    if (isInt(l.mood) && l.mood >= 1 && l.mood <= 5) out.mood = l.mood;
    logs[key] = out;
  }
  return { version: 1, settings: { startDate: s.startDate, lengthDays: s.lengthDays, streakThreshold: s.streakThreshold }, habits, logs };
}

/** Validates an unknown value as AppState, migrating older versions. `now` stamps migrated records. */
export function validateState(input: unknown, now: string = new Date().toISOString()): Validation {
  if (!isRecord(input)) return fail("Not a Grove export (expected an object)");
  if (input.version === 3) return validateV3(input);
  if (input.version === 1) {
    const v1 = validateV1(input);
    if (isStr(v1)) return fail(v1);
    return validateV3(migrateV1(v1, now) as unknown as Record<string, unknown>);
  }
  if (input.version === undefined) return fail("Not a Grove export (no version field)");
  return fail(`Unsupported data version: ${String(input.version)}`);
}

// ---------- persistence ----------

async function park(adapter: StorageAdapter, key: string, raw: string): Promise<void> {
  try {
    if ((await adapter.get(key)) === null) await adapter.set(key, raw);
  } catch {
    // storage is unwritable: nothing more to do
  }
}

/**
 * Loads the state. Order: the v3 key; else the old v1 key (migrated, raw copy parked
 * once; the old key is left in place so nothing is lost before the v3 copy is saved);
 * else defaults. Unreadable data is parked under a timestamped backup key, then defaults.
 * A read error rejects: the caller must not save defaults over data it could not read.
 */
export async function load(adapter: StorageAdapter, today: YMD, now: string): Promise<AppState> {
  const raw = await adapter.get(STORAGE_KEY);
  if (raw === null) {
    const v1raw = await adapter.get(V1_KEY);
    if (v1raw === null) return defaultState(now);
    const r = parseImport(v1raw, now);
    await park(adapter, r.ok ? BACKUP_V1_KEY : `${BACKUP_UNREADABLE_KEY}:${now}`, v1raw);
    // Like an import: an arc that already ended before the upgrade does not celebrate on load.
    return r.ok ? markFinishedCelebrated(r.state, today) : defaultState(now);
  }
  const r = parseImport(raw, now);
  if (r.ok) return r.state;
  await park(adapter, `${BACKUP_UNREADABLE_KEY}:${now}`, raw);
  return defaultState(now);
}

/** Persists the state. Resolves false when storage refuses (quota, private mode); never throws. */
export async function save(adapter: StorageAdapter, state: AppState): Promise<boolean> {
  try {
    await adapter.set(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// ---------- export / import ----------

export function serialize(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImport(text: string, now: string = new Date().toISOString()): Validation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail("The file is not valid JSON");
  }
  return validateState(parsed, now);
}
