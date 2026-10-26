export type Category = "morning" | "body" | "mind" | "discipline" | "custom";

export type Habit = {
  id: string;
  name: string;
  detail?: string; // e.g. "10 pages"
  category: Category;
  order: number; // list position
  createdAt: string; // YYYY-MM-DD local; scheduled from this day
  archivedAt?: string; // YYYY-MM-DD local; not scheduled from this day on
};

export type Rating = 1 | 2 | 3 | 4 | 5;

export type DayLog = {
  date: string; // YYYY-MM-DD local
  completedHabitIds: string[];
  mood?: Rating;
  sleepHours?: number;
  sleepQuality?: Rating;
  journalWin?: string;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  createdAt: string;
};

export type ArcSettings = {
  startDate: string; // YYYY-MM-DD local
  lengthDays: number; // default 90
  streakThreshold: number; // percent, default 80
  sleepTargetHours: number; // default 8
};

export type AppState = {
  version: 1;
  settings: ArcSettings;
  habits: Habit[];
  logs: Record<string, DayLog>; // keyed by date
  goals: Goal[];
  ui: { lastCelebratedLevel: number };
};

export const CATEGORIES: readonly Category[] = ["morning", "body", "mind", "discipline", "custom"];
