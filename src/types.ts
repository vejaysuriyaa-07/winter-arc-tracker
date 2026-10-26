// Grove data model, version 3 (SPEC-v2 section 8).
// Calendar days are local YYYY-MM-DD strings (lib/dates.ts); timestamps are ISO strings.

export type Season = "winter" | "spring" | "summer" | "autumn";
export type Mood = "great" | "good" | "okay" | "low" | "rough";
export type Look = "journal" | "greenhouse" | "night";

export const SEASONS: readonly Season[] = ["winter", "spring", "summer", "autumn"];
export const MOODS: readonly Mood[] = ["great", "good", "okay", "low", "rough"];
export const LOOKS: readonly Look[] = ["journal", "greenhouse", "night"];

export type Arc = {
  id: string;
  name: string;
  season: Season;
  look: Look; // default "journal"
  startDate: string; // YYYY-MM-DD local
  lengthDays: number;
  threshold: number; // percent, default 80
  createdAt: string; // ISO timestamp
  frozenAt?: string; // ISO timestamp, set once the arc-complete celebration ran
  updatedAt: string; // ISO timestamp
  deleted?: boolean;
};

export type Habit = {
  id: string;
  arcId: string;
  name: string;
  detail?: string;
  order: number;
  createdAt: string; // YYYY-MM-DD local; scheduled from this day
  archivedAt?: string; // YYYY-MM-DD local; not scheduled from this day on
  updatedAt: string; // ISO timestamp
  deleted?: boolean;
};

export type DayLog = {
  id: string;
  arcId: string;
  date: string; // YYYY-MM-DD local
  completedHabitIds: string[];
  mood?: Mood;
  updatedAt: string; // ISO timestamp
};

export type VisitorFound = {
  id: string;
  arcId: string;
  visitorId: string;
  foundOn: string; // YYYY-MM-DD local
  updatedAt: string; // ISO timestamp
};

export type Settings = {
  autoNight: boolean;
  haptics: boolean;
  sounds: boolean;
  motion: boolean;
  nudge: boolean;
  recap: boolean;
  updatedAt: string; // ISO timestamp
};

export type SyncTable = "arcs" | "habits" | "day_logs" | "visitors_found" | "settings";
export const SYNC_TABLES: readonly SyncTable[] = ["arcs", "habits", "day_logs", "visitors_found", "settings"];

/** One pending upsert. Deletes travel as `deleted` tombstones on the row itself. */
export type SyncOp = { table: SyncTable; id: string; at: string };

export type UiState = {
  /** Keys: "bloom:<arcId>:<date>", "arc:<arcId>", "visitor:<visitorFoundId>". */
  celebrated: Record<string, boolean>;
  /** Recap week keys ("<arcId>:<mondayYMD>") already opened. */
  recapSeen: string[];
  signInPrompted: boolean;
  notificationsPrompted: boolean;
};

export type AppState = {
  version: 3;
  arcs: Arc[];
  activeArcId: string | null;
  habits: Habit[];
  logs: Record<string, DayLog>; // key `${arcId}:${date}`
  visitors: VisitorFound[];
  settings: Settings;
  ui: UiState;
  sync: { lastPulledAt?: string; queue: SyncOp[] };
};

export function logKey(arcId: string, date: string): string {
  return `${arcId}:${date}`;
}
