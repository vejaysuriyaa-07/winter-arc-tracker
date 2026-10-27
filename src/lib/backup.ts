// Export and import helpers (SPEC 5.10). The format is the v3 AppState (storage.serialize).
import type { AppState } from "../types";
import type { YMD } from "./dates";

export function backupFileName(today: YMD): string {
  return `grove-backup-${today}.json`;
}

/** "2 arcs (Winter Arc, Study Arc), 9 habits, 40 days logged" for the confirmation sheet. */
export function describeBackup(state: AppState): string {
  const arcs = state.arcs.filter((a) => !a.deleted);
  const habits = state.habits.filter((h) => !h.deleted && arcs.some((a) => a.id === h.arcId)).length;
  const days = Object.values(state.logs).filter((l) => l.completedHabitIds.length > 0 || l.mood !== undefined).length;
  return `${arcs.length} ${arcs.length === 1 ? "arc" : "arcs"} (${arcs.map((a) => a.name).join(", ")}), ${habits} ${habits === 1 ? "habit" : "habits"}, ${days} ${days === 1 ? "day" : "days"} logged`;
}
