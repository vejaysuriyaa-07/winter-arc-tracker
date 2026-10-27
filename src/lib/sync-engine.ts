// The sync engine (SPEC 10), free of any network code so it is tested against
// a fake remote. Push the queue (upsert by id), then pull rows changed since
// the last pull. Per row, the newest updatedAt wins; the server applies the
// same rule (supabase/migrations/0001_grove.sql), so a late stale write never
// replaces newer data. Pulled rows never queue ops and never celebrate live.
import type { AppState, Arc, DayLog, Habit, Mood, Settings, SyncOp, SyncTable, VisitorFound } from "../types";
import { SYNC_TABLES, logKey } from "../types";
import type { YMD } from "./dates";
import { arcCelebrationKey } from "./arcs";
import { arcEnd } from "./stats";
import { SETTINGS_ID, syncVisitors } from "./mutations";
import { defaultState } from "./storage";

export type Row = Record<string, unknown>;

export interface Remote {
  /** Upsert rows by (user_id, id). */
  push(table: SyncTable, rows: Row[]): Promise<void>;
  /** Rows whose server `synced_at` is after `since` (all rows when undefined). */
  pull(table: SyncTable, since: string | undefined): Promise<Row[]>;
}

export interface SyncIO {
  getState(): AppState;
  apply(fn: (s: AppState) => AppState): void;
  remote: Remote;
  userId: string;
  now(): string;
  today(): YMD;
}

/** Wraps io so that once `isCurrent` turns false (signed out, another account) nothing more is applied. */
export function guardIO(io: SyncIO, isCurrent: () => boolean): SyncIO {
  return {
    ...io,
    apply: (fn) => {
      if (!isCurrent()) throw new Error("stale sync run");
      io.apply(fn);
    },
  };
}

/** Pulls reach back this far past the last pull, so a write that committed late is not missed. Merging is idempotent. */
export const PULL_OVERLAP_MS = 60_000;

/** Postgres sends microseconds; some browsers only parse milliseconds, so extra digits are dropped first. */
export function serverTime(v: unknown): number {
  return typeof v === "string" ? Date.parse(v.replace(/(\.\d{3})\d+/, "$1")) : Number.NaN;
}
const time = serverTime;
/** A server timestamp as local ISO; an unreadable one becomes the epoch, which every real change outranks. */
const iso = (v: unknown): string => {
  const t = serverTime(v);
  return new Date(Number.isFinite(t) ? t : 0).toISOString();
};
const optional = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

// ---------- rows <-> records ----------

type AnyRecord = Arc | Habit | DayLog | VisitorFound | Settings;

export function toRow(table: SyncTable, r: AnyRecord, userId: string): Row {
  switch (table) {
    case "arcs": {
      const a = r as Arc;
      return { id: a.id, user_id: userId, name: a.name, season: a.season, look: a.look, start_date: a.startDate, length_days: a.lengthDays, threshold: a.threshold, created_at: a.createdAt, frozen_at: a.frozenAt ?? null, updated_at: a.updatedAt, deleted: a.deleted ?? false };
    }
    case "habits": {
      const h = r as Habit;
      return { id: h.id, user_id: userId, arc_id: h.arcId, name: h.name, detail: h.detail ?? null, sort_order: h.order, created_on: h.createdAt, archived_on: h.archivedAt ?? null, updated_at: h.updatedAt, deleted: h.deleted ?? false };
    }
    case "day_logs": {
      const l = r as DayLog;
      return { id: l.id, user_id: userId, arc_id: l.arcId, date: l.date, completed_habit_ids: l.completedHabitIds, mood: l.mood ?? null, updated_at: l.updatedAt };
    }
    case "visitors_found": {
      const v = r as VisitorFound;
      return { id: v.id, user_id: userId, arc_id: v.arcId, visitor_id: v.visitorId, found_on: v.foundOn, updated_at: v.updatedAt };
    }
    case "settings": {
      const s = r as Settings;
      // One settings row per user: its id is the user's id.
      return { id: userId, user_id: userId, auto_night: s.autoNight, haptics: s.haptics, sounds: s.sounds, motion: s.motion, nudge: s.nudge, recap: s.recap, updated_at: s.updatedAt };
    }
  }
}

export function fromRow(table: "arcs", row: Row): Arc;
export function fromRow(table: "habits", row: Row): Habit;
export function fromRow(table: "day_logs", row: Row): DayLog;
export function fromRow(table: "visitors_found", row: Row): VisitorFound;
export function fromRow(table: "settings", row: Row): Settings;
export function fromRow(table: SyncTable, row: Row): AnyRecord;
export function fromRow(table: SyncTable, row: Row): AnyRecord {
  switch (table) {
    case "arcs": {
      const a: Arc = { id: String(row.id), name: String(row.name), season: row.season as Arc["season"], look: row.look as Arc["look"], startDate: String(row.start_date), lengthDays: Number(row.length_days), threshold: Number(row.threshold), createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) };
      if (optional(row.frozen_at)) a.frozenAt = iso(row.frozen_at);
      if (row.deleted === true) a.deleted = true;
      return a;
    }
    case "habits": {
      const h: Habit = { id: String(row.id), arcId: String(row.arc_id), name: String(row.name), order: Number(row.sort_order), createdAt: String(row.created_on), updatedAt: iso(row.updated_at) };
      if (optional(row.detail)) h.detail = String(row.detail);
      if (optional(row.archived_on)) h.archivedAt = String(row.archived_on);
      if (row.deleted === true) h.deleted = true;
      return h;
    }
    case "day_logs": {
      const l: DayLog = { id: String(row.id), arcId: String(row.arc_id), date: String(row.date), completedHabitIds: Array.isArray(row.completed_habit_ids) ? row.completed_habit_ids.map(String) : [], updatedAt: iso(row.updated_at) };
      if (optional(row.mood)) l.mood = row.mood as Mood;
      return l;
    }
    case "visitors_found":
      return { id: String(row.id), arcId: String(row.arc_id), visitorId: String(row.visitor_id), foundOn: String(row.found_on), updatedAt: iso(row.updated_at) };
    case "settings":
      return { autoNight: Boolean(row.auto_night), haptics: Boolean(row.haptics), sounds: Boolean(row.sounds), motion: Boolean(row.motion), nudge: Boolean(row.nudge), recap: Boolean(row.recap), updatedAt: iso(row.updated_at) };
  }
}

// ---------- rows the server would refuse ----------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const intIn = (v: unknown, lo: number, hi: number): boolean => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const finite = (v: unknown): boolean => Number.isFinite(serverTime(v));

/**
 * The column types and checks of supabase/migrations/0001_grove.sql. A row
 * that fails them (an id from an old hand-made backup, a length out of range)
 * stays on this device and is not sent, so one bad row never blocks the rest.
 */
export function sendable(table: SyncTable, r: Row): boolean {
  if (!UUID.test(String(r.id)) || !UUID.test(String(r.user_id)) || !finite(r.updated_at)) return false;
  if ("arc_id" in r && !UUID.test(String(r.arc_id))) return false;
  switch (table) {
    case "arcs":
      return intIn(r.length_days, 1, 3650) && intIn(r.threshold, 0, 100) && finite(r.created_at)
        && ["winter", "spring", "summer", "autumn"].includes(String(r.season)) && ["journal", "greenhouse", "night"].includes(String(r.look));
    case "habits":
      return intIn(r.sort_order, -2147483648, 2147483647);
    case "day_logs":
      return r.mood === null || ["great", "good", "okay", "low", "rough"].includes(String(r.mood));
    default:
      return true;
  }
}

// ---------- local lookups ----------

function recordFor(state: AppState, op: SyncOp): AnyRecord | undefined {
  switch (op.table) {
    case "arcs": return state.arcs.find((a) => a.id === op.id);
    case "habits": return state.habits.find((h) => h.id === op.id);
    case "day_logs": return Object.values(state.logs).find((l) => l.id === op.id);
    case "visitors_found": return state.visitors.find((v) => v.id === op.id);
    case "settings": return state.settings;
  }
}

/** Queue every record, as on first sign in: the server keeps whichever copy is newer. */
export function queueAll(state: AppState): AppState {
  const ops: SyncOp[] = [
    ...state.arcs.map((a) => ({ table: "arcs" as const, id: a.id, at: a.updatedAt })),
    ...state.habits.map((h) => ({ table: "habits" as const, id: h.id, at: h.updatedAt })),
    ...Object.values(state.logs).map((l) => ({ table: "day_logs" as const, id: l.id, at: l.updatedAt })),
    ...state.visitors.map((v) => ({ table: "visitors_found" as const, id: v.id, at: v.updatedAt })),
    { table: "settings" as const, id: SETTINGS_ID, at: state.settings.updatedAt },
  ];
  const seen = new Set(ops.map((o) => `${o.table}:${o.id}`));
  const keep = state.sync.queue.filter((o) => !seen.has(`${o.table}:${o.id}`));
  return { ...state, sync: { ...state.sync, queue: [...keep, ...ops] } };
}

// ---------- push ----------

async function push(io: SyncIO): Promise<void> {
  const sent = [...io.getState().sync.queue];
  if (sent.length === 0) return;
  const state = io.getState();
  for (const table of SYNC_TABLES) {
    const rows = sent.filter((op) => op.table === table).flatMap((op) => {
      const r = recordFor(state, op);
      if (!r) return [];
      const row = toRow(table, r, io.userId);
      return sendable(table, row) ? [row] : [];
    });
    if (rows.length) await io.remote.push(table, rows);
  }
  // Drop what was sent; an op re-queued with a newer `at` during the push stays.
  const done = new Set(sent.map((op) => `${op.table}:${op.id}:${op.at}`));
  io.apply((s) => ({ ...s, sync: { ...s.sync, queue: s.sync.queue.filter((op) => !done.has(`${op.table}:${op.id}:${op.at}`)) } }));
}

// ---------- pull and merge ----------

export type PageCursor = { syncedAt: string; id: string } | null;

/**
 * Reads every page, ordered by (synced_at, id) and continuing after the last
 * row seen. Rows written in one transaction share a synced_at, so paging by
 * offset could skip some; the key never does.
 */
export async function pullAll(fetchPage: (after: PageCursor) => Promise<Row[]>, pageSize: number): Promise<Row[]> {
  const out: Row[] = [];
  let after: PageCursor = null;
  for (;;) {
    const page = await fetchPage(after);
    out.push(...page);
    if (page.length < pageSize) return out;
    const last = page[page.length - 1]!;
    after = { syncedAt: String(last.synced_at), id: String(last.id) };
  }
}

const newer = (incoming: { updatedAt: string }, local: { updatedAt: string } | undefined): boolean =>
  local === undefined || time(incoming.updatedAt) > time(local.updatedAt);

function dropOp(state: AppState, table: SyncTable, id: string): AppState {
  return { ...state, sync: { ...state.sync, queue: state.sync.queue.filter((op) => !(op.table === table && op.id === id)) } };
}

/** Merge pulled rows into local state: a row replaces local only when strictly newer. Exported for tests. */
export function mergeRows(state: AppState, table: SyncTable, rows: Row[]): { state: AppState; newArcs: string[] } {
  let s = state;
  const newArcs: string[] = [];
  for (const row of rows) {
    switch (table) {
      case "arcs": {
        const a = fromRow("arcs", row);
        const i = s.arcs.findIndex((x) => x.id === a.id);
        if (!newer(a, s.arcs[i])) break;
        if (i < 0) newArcs.push(a.id);
        s = dropOp({ ...s, arcs: i < 0 ? [...s.arcs, a] : s.arcs.map((x, j) => (j === i ? a : x)) }, "arcs", a.id);
        break;
      }
      case "habits": {
        const h = fromRow("habits", row);
        const i = s.habits.findIndex((x) => x.id === h.id);
        if (!newer(h, s.habits[i])) break;
        s = dropOp({ ...s, habits: i < 0 ? [...s.habits, h] : s.habits.map((x, j) => (j === i ? h : x)) }, "habits", h.id);
        break;
      }
      case "day_logs": {
        // One log per arc and day, whatever id each device gave it.
        const l = fromRow("day_logs", row);
        const key = logKey(l.arcId, l.date);
        const cur = s.logs[key];
        if (!newer(l, cur)) break;
        if (cur) s = dropOp(s, "day_logs", cur.id);
        s = dropOp({ ...s, logs: { ...s.logs, [key]: l } }, "day_logs", l.id);
        break;
      }
      case "visitors_found": {
        // One visitor of each kind per arc.
        const v = fromRow("visitors_found", row);
        const i = s.visitors.findIndex((x) => x.id === v.id || (x.arcId === v.arcId && x.visitorId === v.visitorId));
        if (!newer(v, s.visitors[i])) break;
        if (i >= 0) s = dropOp(s, "visitors_found", s.visitors[i]!.id);
        s = dropOp({ ...s, visitors: i < 0 ? [...s.visitors, v] : s.visitors.map((x, j) => (j === i ? v : x)) }, "visitors_found", v.id);
        break;
      }
      case "settings": {
        const st = fromRow("settings", row);
        if (!newer(st, s.settings)) break;
        s = dropOp({ ...s, settings: st }, "settings", SETTINGS_ID);
        break;
      }
    }
  }
  return { state: s, newArcs };
}

/** The active arc stays put if it still exists; otherwise the latest-starting live arc. */
function fixActiveArc(state: AppState): AppState {
  const live = state.arcs.filter((a) => !a.deleted);
  if (state.activeArcId && live.some((a) => a.id === state.activeArcId)) return state;
  const pick = [...live].sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0))[0];
  const activeArcId = pick?.id ?? null;
  return activeArcId === state.activeArcId ? state : { ...state, activeArcId };
}

async function pull(io: SyncIO): Promise<void> {
  const last = io.getState().sync.lastPulledAt;
  const since = last === undefined ? undefined : new Date(time(last) - PULL_OVERLAP_MS).toISOString();
  const pulled: [SyncTable, Row[]][] = [];
  for (const table of SYNC_TABLES) pulled.push([table, await io.remote.pull(table, since)]);
  let maxSynced = last === undefined ? Number.NEGATIVE_INFINITY : time(last);
  for (const [, rows] of pulled) for (const r of rows) maxSynced = Math.max(maxSynced, time(r.synced_at));
  const today = io.today();
  const now = io.now();
  io.apply((s0) => {
    let s = s0;
    const finishedBefore = new Set(s0.arcs.filter((a) => today > arcEnd(a)).map((a) => a.id));
    for (const [table, rows] of pulled) s = mergeRows(s, table, rows).state;
    // An arc that arrives finished, or is finished by a change from another device, is history here, not a live finish.
    const celebrated = { ...s.ui.celebrated };
    for (const a of s.arcs) {
      if (!a.deleted && today > arcEnd(a) && !finishedBefore.has(a.id)) celebrated[arcCelebrationKey(a.id)] = true;
    }
    s = fixActiveArc({ ...s, ui: { ...s.ui, celebrated } });
    // Visitors already earned in synced data join quietly, never as a live arrival.
    s = syncVisitors(s, now, today, true).state;
    return Number.isFinite(maxSynced) ? { ...s, sync: { ...s.sync, lastPulledAt: new Date(maxSynced).toISOString() } } : s;
  });
}

/**
 * One full round: push the queue, pull, then push anything the pull produced
 * (visitors earned by the merged data). Throws on any network or server
 * failure; the queue is kept.
 */
export async function syncOnce(io: SyncIO): Promise<void> {
  await push(io);
  await pull(io);
  await push(io);
}

// ---------- import ----------

/**
 * An imported backup replaces this device's data, and through sync the
 * account's: its rows are stamped now so they win, arcs and habits it does not
 * have are tombstoned, and this device's own sync position is kept.
 */
export function prepareImport(prev: AppState, file: AppState, now: string): AppState {
  const stamp = <T extends { updatedAt: string }>(r: T): T => ({ ...r, updatedAt: now });
  const arcIds = new Set(file.arcs.map((a) => a.id));
  const habitIds = new Set(file.habits.map((h) => h.id));
  const goneArcs = prev.arcs.filter((a) => !arcIds.has(a.id)).map((a) => ({ ...a, deleted: true }));
  const goneHabits = prev.habits.filter((h) => !habitIds.has(h.id)).map((h) => ({ ...h, deleted: true }));
  const next: AppState = {
    ...file,
    arcs: [...file.arcs, ...goneArcs].map(stamp),
    habits: [...file.habits, ...goneHabits].map(stamp),
    logs: {
      // Day logs cannot be deleted; one the file does not have is emptied instead.
      ...Object.fromEntries(Object.entries(prev.logs).filter(([k]) => !(k in file.logs)).map(([k, l]) => [k, stamp({ id: l.id, arcId: l.arcId, date: l.date, completedHabitIds: [], updatedAt: l.updatedAt })])),
      ...Object.fromEntries(Object.entries(file.logs).map(([k, l]) => [k, stamp(l)])),
    },
    visitors: file.visitors.map(stamp),
    settings: stamp(file.settings),
    sync: { ...(prev.sync.lastPulledAt === undefined ? {} : { lastPulledAt: prev.sync.lastPulledAt }), queue: [] },
  };
  return queueAll(next);
}

// ---------- signing in ----------

/**
 * What signing in does to this device. The first account here, or the same
 * one again, takes in the local data (every row queued, a full pull). A
 * different account never receives another person's gardens: the device
 * starts empty (the caller backs up the old data first) and fills from the
 * account. Either way the sign-in card has done its job.
 */
export function afterSignIn(state: AppState, lastUserId: string | null, userId: string, now: string): { state: AppState; backup: boolean } {
  if (lastUserId !== null && lastUserId !== userId) {
    const fresh = defaultState(now);
    return {
      backup: true,
      state: { ...fresh, settings: { ...fresh.settings, updatedAt: new Date(0).toISOString() }, ui: { ...fresh.ui, signInPrompted: true }, sync: { queue: [] } },
    };
  }
  const { lastPulledAt: _drop, ...rest } = state.sync;
  return { backup: false, state: queueAll({ ...state, ui: { ...state.ui, signInPrompted: true }, sync: rest }) };
}
