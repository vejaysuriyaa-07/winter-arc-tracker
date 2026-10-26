// Pure state transitions. The store applies these; tests call them directly.
// Each returns the same object when nothing changes. Every change to a synced
// record stamps `updatedAt = now` and queues one op per row (coalesced).
import type { AppState, Arc, DayLog, Habit, Look, Mood, Season, Settings, SyncTable, UiState } from "../types";
import { logKey } from "../types";
import { isValidYMD, type YMD } from "./dates";
import { newId } from "./ids";

/** The settings row has one fixed id locally; the sync layer keys it by user. */
export const SETTINGS_ID = "settings";

function queue(state: AppState, table: SyncTable, id: string, at: string): AppState {
  const rest = state.sync.queue.filter((op) => !(op.table === table && op.id === id));
  return { ...state, sync: { ...state.sync, queue: [...rest, { table, id, at }] } };
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ---------- day logs ----------

function logFor(state: AppState, arcId: string, date: YMD): DayLog | undefined {
  return state.logs[logKey(arcId, date)];
}

function putLog(state: AppState, now: string, log: DayLog): AppState {
  const next = { ...log, updatedAt: now };
  return queue({ ...state, logs: { ...state.logs, [logKey(log.arcId, log.date)]: next } }, "day_logs", log.id, now);
}

function emptyLog(arcId: string, date: YMD, now: string): DayLog {
  return { id: newId(), arcId, date, completedHabitIds: [], updatedAt: now };
}

export function toggleHabit(state: AppState, now: string, arcId: string, date: YMD, habitId: string): AppState {
  const log = logFor(state, arcId, date) ?? emptyLog(arcId, date, now);
  const done = log.completedHabitIds.includes(habitId);
  const completedHabitIds = done ? log.completedHabitIds.filter((id) => id !== habitId) : [...log.completedHabitIds, habitId];
  return putLog(state, now, { ...log, completedHabitIds });
}

export function setCheckoff(state: AppState, now: string, arcId: string, date: YMD, habitId: string, checked: boolean): AppState {
  const done = logFor(state, arcId, date)?.completedHabitIds.includes(habitId) ?? false;
  return done === checked ? state : toggleHabit(state, now, arcId, date, habitId);
}

export function setMood(state: AppState, now: string, arcId: string, date: YMD, mood: Mood | undefined): AppState {
  const cur = logFor(state, arcId, date);
  if (cur?.mood === mood && (mood !== undefined || cur !== undefined)) return state;
  if (cur === undefined && mood === undefined) return state;
  const log: DayLog = { ...(cur ?? emptyLog(arcId, date, now)) };
  if (mood === undefined) delete log.mood;
  else log.mood = mood;
  return putLog(state, now, log);
}

// ---------- habits ----------

function putHabit(state: AppState, now: string, habit: Habit): AppState {
  const exists = state.habits.some((h) => h.id === habit.id);
  const next = { ...habit, updatedAt: now };
  const habits = exists ? state.habits.map((h) => (h.id === habit.id ? next : h)) : [...state.habits, next];
  return queue({ ...state, habits }, "habits", habit.id, now);
}

export type NewHabit = { name: string; detail?: string | undefined };

export function addHabit(state: AppState, now: string, today: YMD, arcId: string, input: NewHabit): AppState {
  const name = input.name.trim();
  if (name === "" || !state.arcs.some((a) => a.id === arcId)) return state;
  const order = state.habits.filter((h) => h.arcId === arcId).reduce((m, h) => Math.max(m, h.order), -1) + 1;
  const habit: Habit = { id: newId(), arcId, name, order, createdAt: today, updatedAt: now };
  const detail = input.detail?.trim();
  if (detail) habit.detail = detail;
  return putHabit(state, now, habit);
}

export type HabitPatch = { name?: string; detail?: string | undefined };

export function editHabit(state: AppState, now: string, habitId: string, patch: HabitPatch): AppState {
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return state;
  const next: Habit = { ...habit };
  if (patch.name !== undefined && patch.name.trim() !== "") next.name = patch.name.trim();
  if ("detail" in patch) {
    const d = patch.detail?.trim();
    if (d) next.detail = d;
    else delete next.detail;
  }
  if (next.name === habit.name && next.detail === habit.detail) return state;
  return putHabit(state, now, next);
}

/** Active habits of the arc take positions 0..n in the given order; unlisted active ones follow. */
export function reorderHabits(state: AppState, now: string, arcId: string, ids: readonly string[]): AppState {
  const active = state.habits
    .filter((h) => h.arcId === arcId && !h.deleted && h.archivedAt === undefined)
    .sort((a, b) => a.order - b.order);
  const listed = ids.map((id) => active.find((h) => h.id === id)).filter((h): h is Habit => h !== undefined);
  const rest = active.filter((h) => !ids.includes(h.id));
  let next = state;
  [...listed, ...rest].forEach((h, order) => {
    if (h.order !== order) next = putHabit(next, now, { ...h, order });
  });
  return next;
}

/** Never scheduled on a past day and never checked off: it can go without changing any past number. */
export function isHardDeletable(state: AppState, habit: Habit, today: YMD): boolean {
  if (habit.createdAt < today) return false;
  return !Object.values(state.logs).some((l) => l.arcId === habit.arcId && l.completedHabitIds.includes(habit.id));
}

/**
 * Remove from the arc (SPEC 5.1). Hard delete (tombstone) when it has no history;
 * otherwise archive from today so past days never change and its plant wilts.
 */
export function removeHabit(state: AppState, now: string, today: YMD, habitId: string): AppState {
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit || habit.deleted) return state;
  if (isHardDeletable(state, habit, today)) return putHabit(state, now, { ...habit, deleted: true });
  if (habit.archivedAt !== undefined) return state;
  // A habit that starts later than today is archived on its own start day, which schedules nothing.
  return putHabit(state, now, { ...habit, archivedAt: habit.createdAt > today ? habit.createdAt : today });
}

/**
 * A removal can be undone only on the day it was made: undoing an older one would
 * schedule the habit on past days again and change their numbers (SPEC 13).
 */
export function canRestore(habit: Habit, today: YMD): boolean {
  if (habit.deleted) return habit.createdAt >= today; // a tombstone only ever comes from a habit with no history
  return habit.archivedAt !== undefined && habit.archivedAt >= today;
}

/** Undo for removeHabit, the same day only. */
export function restoreHabit(state: AppState, now: string, today: YMD, habitId: string): AppState {
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit || (!habit.deleted && habit.archivedAt === undefined) || !canRestore(habit, today)) return state;
  const next: Habit = { ...habit };
  delete next.deleted;
  delete next.archivedAt;
  return putHabit(state, now, next);
}

// ---------- arcs ----------

function putArc(state: AppState, now: string, arc: Arc): AppState {
  const exists = state.arcs.some((a) => a.id === arc.id);
  const next = { ...arc, updatedAt: now };
  const arcs = exists ? state.arcs.map((a) => (a.id === arc.id ? next : a)) : [...state.arcs, next];
  return queue({ ...state, arcs }, "arcs", arc.id, now);
}

const SEASON_NAMES: Record<Season, string> = { winter: "Winter Arc", spring: "Spring Arc", summer: "Summer Arc", autumn: "Autumn Arc" };

export function defaultArcName(season: Season): string {
  return SEASON_NAMES[season];
}

export type NewArc = {
  name: string;
  season: Season;
  look: Look;
  startDate: YMD;
  lengthDays: number;
  threshold?: number;
  habits?: NewHabit[];
};

export function createArc(state: AppState, now: string, input: NewArc): AppState {
  if (!isValidYMD(input.startDate)) return state;
  const arc: Arc = {
    id: newId(),
    name: input.name.trim() || defaultArcName(input.season),
    season: input.season,
    look: input.look,
    startDate: input.startDate,
    lengthDays: clamp(Math.round(input.lengthDays) || 1, 1, 3650),
    threshold: clamp(Math.round(input.threshold ?? 80), 0, 100),
    createdAt: now,
    updatedAt: now,
  };
  let next = putArc({ ...state, activeArcId: arc.id }, now, arc);
  let order = 0;
  for (const h of input.habits ?? []) {
    const name = h.name.trim();
    if (!name) continue;
    const habit: Habit = { id: newId(), arcId: arc.id, name, order: order++, createdAt: input.startDate, updatedAt: now };
    const d = h.detail?.trim();
    if (d) habit.detail = d;
    next = putHabit(next, now, habit);
  }
  return next;
}

export type ArcPatch = Partial<Pick<Arc, "name" | "season" | "look" | "startDate" | "lengthDays" | "threshold">>;

export function updateArc(state: AppState, now: string, arcId: string, patch: ArcPatch): AppState {
  const arc = state.arcs.find((a) => a.id === arcId);
  if (!arc) return state;
  const next: Arc = { ...arc };
  if (patch.name !== undefined && patch.name.trim() !== "") next.name = patch.name.trim();
  if (patch.season !== undefined) next.season = patch.season;
  if (patch.look !== undefined) next.look = patch.look;
  if (patch.startDate !== undefined && isValidYMD(patch.startDate)) next.startDate = patch.startDate;
  if (patch.lengthDays !== undefined) next.lengthDays = clamp(Math.round(patch.lengthDays) || 1, 1, 3650);
  if (patch.threshold !== undefined) next.threshold = clamp(Math.round(patch.threshold), 0, 100);
  const changed = (Object.keys(next) as (keyof Arc)[]).some((k) => next[k] !== arc[k]);
  if (!changed) return state;
  let out = putArc(state, now, next);
  if (next.startDate !== arc.startDate) {
    // Habits that started with the arc move with it, so they stay scheduled from day 1.
    // An archived habit never starts after its archive day (that day then schedules nothing).
    for (const h of out.habits) {
      if (h.arcId !== arcId || h.deleted || h.createdAt > arc.startDate) continue;
      const start = h.archivedAt !== undefined && h.archivedAt < next.startDate ? h.archivedAt : next.startDate;
      if (start !== h.createdAt) out = putHabit(out, now, { ...h, createdAt: start });
    }
  }
  return out;
}

export function setActiveArc(state: AppState, arcId: string): AppState {
  if (state.activeArcId === arcId || !state.arcs.some((a) => a.id === arcId && !a.deleted)) return state;
  return { ...state, activeArcId: arcId };
}

export function freezeArc(state: AppState, now: string, arcId: string): AppState {
  const arc = state.arcs.find((a) => a.id === arcId);
  if (!arc || arc.frozenAt !== undefined) return state;
  return putArc(state, now, { ...arc, frozenAt: now });
}

export function deleteArc(state: AppState, now: string, arcId: string): AppState {
  const arc = state.arcs.find((a) => a.id === arcId);
  if (!arc || arc.deleted) return state;
  let next = putArc(state, now, { ...arc, deleted: true });
  for (const h of next.habits) if (h.arcId === arcId && !h.deleted) next = putHabit(next, now, { ...h, deleted: true });
  if (next.activeArcId === arcId) {
    const other = next.arcs.find((a) => !a.deleted);
    next = { ...next, activeArcId: other ? other.id : null };
  }
  return next;
}

/**
 * Reset this arc: start today, empty its day logs (kept and queued so the reset
 * syncs), clear its bloom and arc celebrations and recap flags, tombstone archived
 * habits. Found visitors are never lost (SPEC 7.3), so they stay.
 */
export function resetArc(state: AppState, now: string, today: YMD, arcId: string): AppState {
  const arc = state.arcs.find((a) => a.id === arcId);
  if (!arc) return state;
  const restarted: Arc = { ...arc, startDate: today };
  delete restarted.frozenAt;
  let next = putArc(state, now, restarted);
  for (const h of next.habits) {
    if (h.arcId !== arcId || h.deleted) continue;
    next = h.archivedAt !== undefined ? putHabit(next, now, { ...h, deleted: true }) : putHabit(next, now, { ...h, createdAt: today });
  }
  for (const l of Object.values(next.logs)) {
    if (l.arcId !== arcId || (l.completedHabitIds.length === 0 && l.mood === undefined)) continue;
    next = putLog(next, now, { id: l.id, arcId: l.arcId, date: l.date, completedHabitIds: [], updatedAt: now });
  }
  const celebrated: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(next.ui.celebrated)) {
    if (k.startsWith(`bloom:${arcId}:`) || k === `arc:${arcId}`) continue;
    celebrated[k] = v;
  }
  const recapSeen = next.ui.recapSeen.filter((k) => !k.startsWith(`${arcId}:`));
  return { ...next, ui: { ...next.ui, celebrated, recapSeen } };
}

// ---------- settings ----------

export type SettingsPatch = Partial<Omit<Settings, "updatedAt">>;

export function updateSettings(state: AppState, now: string, patch: SettingsPatch): AppState {
  const cur = state.settings;
  const keys = Object.keys(patch) as (keyof SettingsPatch)[];
  if (!keys.some((k) => patch[k] !== undefined && patch[k] !== cur[k])) return state;
  const next: Settings = { ...cur, updatedAt: now };
  for (const k of keys) {
    const v = patch[k];
    if (v !== undefined) next[k] = v;
  }
  return queue({ ...state, settings: next }, "settings", SETTINGS_ID, now);
}

// ---------- visitors ----------

export function addVisitor(state: AppState, now: string, arcId: string, visitorId: string, foundOn: YMD): AppState {
  if (state.visitors.some((v) => v.arcId === arcId && v.visitorId === visitorId)) return state;
  const v = { id: newId(), arcId, visitorId, foundOn, updatedAt: now };
  return queue({ ...state, visitors: [...state.visitors, v] }, "visitors_found", v.id, now);
}

// ---------- ui (local only, never synced) ----------

export function markCelebrated(state: AppState, key: string): AppState {
  if (state.ui.celebrated[key]) return state;
  return { ...state, ui: { ...state.ui, celebrated: { ...state.ui.celebrated, [key]: true } } };
}

export function markRecapSeen(state: AppState, key: string): AppState {
  if (state.ui.recapSeen.includes(key)) return state;
  return { ...state, ui: { ...state.ui, recapSeen: [...state.ui.recapSeen, key] } };
}

export function setUiFlag(state: AppState, flag: "signInPrompted" | "notificationsPrompted", value: boolean): AppState {
  if (state.ui[flag] === value) return state;
  const ui: UiState = { ...state.ui, [flag]: value };
  return { ...state, ui };
}
