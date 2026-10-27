// Arc-level labels and the arc-complete rule. Pure: `today` is passed in.
import type { AppState, Arc, Look, Season } from "../types";
import { addDays, formatMonthDay, type YMD } from "./dates";
import { arcDayNumber, arcEnd, arcPhase, arcProgress, arcScore, bestChain, fullDays, keptDays } from "./stats";

export const LOOK_NAMES: Record<Look, string> = { journal: "Field journal", greenhouse: "Greenhouse", night: "Night" };

export function themeLabel(look: Look, season: Season): string {
  return `${LOOK_NAMES[look]}, ${season}`;
}

export type ArcStatus = { kind: "before" | "active" | "finished"; label: string; progress: number };

export function arcStatus(state: AppState, arc: Arc, today: YMD): ArcStatus {
  const phase = arcPhase(arc, today);
  if (phase === "before") return { kind: "before", label: `Starts ${formatMonthDay(arc.startDate)}`, progress: 0 };
  if (phase === "complete") {
    const p = arcScore(state, arc, today).percent;
    return { kind: "finished", label: p === null ? "Finished" : `Finished, ${Math.round(p)}%`, progress: 1 };
  }
  return { kind: "active", label: `Day ${arcDayNumber(arc, today)} of ${arc.lengthDays}`, progress: arcProgress(arc, today) };
}

export function arcCelebrationKey(arcId: string): string {
  return `arc:${arcId}`;
}

/** The first finished arc (earliest end) whose celebration has not run (SPEC 5.7). A frozen arc (maybe frozen on another device) never celebrates again. */
export function arcToCelebrate(state: AppState, today: YMD): Arc | null {
  const done = state.arcs
    .filter((a) => !a.deleted && a.frozenAt === undefined && today > arcEnd(a) && !state.ui.celebrated[arcCelebrationKey(a.id)])
    .sort((a, b) => (arcEnd(a) < arcEnd(b) ? -1 : 1));
  return done[0] ?? null;
}

export type ArcSummary = { score: number | null; bestChain: number; visitors: number; fullDays: number; keptDays: number; days: number };

export function arcSummary(state: AppState, arc: Arc, today: YMD): ArcSummary {
  return {
    score: arcScore(state, arc, today).percent,
    bestChain: bestChain(state, arc, today),
    visitors: state.visitors.filter((v) => v.arcId === arc.id).length,
    fullDays: fullDays(state, arc, today),
    keptDays: keptDays(state, arc, today),
    days: arc.lengthDays,
  };
}

/** Arcs finished at `today` are marked celebrated, so imported history never celebrates on load. */
export function markFinishedCelebrated(state: AppState, today: YMD): AppState {
  const celebrated = { ...state.ui.celebrated };
  let changed = false;
  for (const a of state.arcs) {
    if (!a.deleted && today > arcEnd(a) && !celebrated[arcCelebrationKey(a.id)]) {
      celebrated[arcCelebrationKey(a.id)] = true;
      changed = true;
    }
  }
  return changed ? { ...state, ui: { ...state.ui, celebrated } } : state;
}

/** The season a new arc starts in by default: by calendar month (Dec-Feb winter, and so on). */
export function seasonForDay(day: YMD): Season {
  const m = Number(day.slice(5, 7));
  if (m === 12 || m <= 2) return "winter";
  if (m <= 5) return "spring";
  if (m <= 8) return "summer";
  return "autumn";
}

export interface ArcEditLimits {
  /** Dates and threshold can change only while the arc is not finished or frozen. */
  editable: boolean;
  /** Shortest length that still includes today, so an edit never ends the arc. */
  minLength: number;
  /** Earliest start that still includes today at the current length. */
  earliestStart: YMD;
}

export function arcEditLimits(arc: Arc, today: YMD): ArcEditLimits {
  return {
    editable: arc.frozenAt === undefined && arcPhase(arc, today) !== "complete",
    minLength: Math.max(1, arcDayNumber(arc, today)),
    earliestStart: addDays(today, -(arc.lengthDays - 1)),
  };
}
