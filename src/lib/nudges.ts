// Local notifications and haptics for the iPhone app (SPEC 11), as plain data.
// Pure: `today` and `now` are passed in; lib/native.ts turns these into plugin calls.
import type { AppState } from "../types";
import { addDays, compareDays, type YMD } from "./dates";
import type { FeedbackEvent } from "./feedback";
import { activeArc, arcEnd, arcPhase, chain, isKept, scheduledHabits } from "./stats";
import { shouldPromptSignIn } from "./prompts";

export const NUDGE_ID = 1;
export const RECAP_ID = 2;

export type PlannedNote =
  | { id: number; title: string; body: string; at: { day: YMD; hour: number; minute: number } }
  | { id: number; title: string; body: string; weekly: { weekday: number; hour: number; minute: number } };

/** Planning stops this many minutes before 20:00, so iOS never gets a time that has already passed. */
const CUTOFF_MINUTES = 2;

/**
 * The notifications that should be pending right now. Recomputed after every
 * change, on launch, on return to the front and every few minutes while open.
 * The nudge is for today while today is still open; once today is kept (or the
 * evening has gone by) it is for tomorrow, so a day the app is never opened
 * still gets its nudge. Opening the app replans, which drops a nudge whose day
 * got kept.
 */
export function nudgePlan(state: AppState, today: YMD, now: Date): PlannedNote[] {
  const arc = activeArc(state);
  if (!arc || arcPhase(arc, today) !== "active") return [];
  const out: PlannedNote[] = [];
  if (state.settings.nudge) {
    const minutes = now.getHours() * 60 + now.getMinutes();
    const kept = isKept(state, arc, today);
    let day: YMD | null = null;
    if (kept === false && minutes < 20 * 60 - CUTOFF_MINUTES) day = today;
    else if (kept !== false) day = addDays(today, 1); // kept, or nothing due today: the chain carries into tomorrow
    // Tomorrow's chain is today's when today is kept or skipped.
    const n = chain(state, arc, today);
    if (day !== null && n >= 2 && compareDays(day, arcEnd(arc)) <= 0 && scheduledHabits(state, arc.id, day).length > 0) {
      out.push({ id: NUDGE_ID, title: "Grove", body: `Your chain is at ${n}. A few habits left.`, at: { day, hour: 20, minute: 0 } });
    }
  }
  if (state.settings.recap) {
    // weekday 1 is Sunday in the notification calendar.
    out.push({ id: RECAP_ID, title: "Grove", body: "Your week in the garden is ready", weekly: { weekday: 1, hour: 18, minute: 0 } });
  }
  return out;
}

/** The plugin's shape for one planned note. A day's time is built from its parts, in local time. */
export function toNotification(n: PlannedNote): { id: number; title: string; body: string; schedule: { at: Date; allowWhileIdle: boolean } | { on: { weekday: number; hour: number; minute: number }; allowWhileIdle: boolean } } {
  if ("at" in n) {
    const [y, m, d] = n.at.day.split("-").map(Number) as [number, number, number];
    return { id: n.id, title: n.title, body: n.body, schedule: { at: new Date(y, m - 1, d, n.at.hour, n.at.minute), allowWhileIdle: true } };
  }
  return { id: n.id, title: n.title, body: n.body, schedule: { on: n.weekly, allowWhileIdle: true } };
}

export type NotificationsLike = {
  cancel(o: { notifications: { id: number }[] }): Promise<void>;
  schedule(o: { notifications: ReturnType<typeof toNotification>[] }): Promise<unknown>;
};

/**
 * Makes the pending notes match the plan. Returns the plan's key once it is
 * in place; on failure returns the previous key so the next pass tries again.
 */
export async function applyPlan(plugin: NotificationsLike, plan: PlannedNote[], lastKey: string): Promise<string> {
  const key = JSON.stringify(plan);
  if (key === lastKey) return lastKey;
  try {
    await plugin.cancel({ notifications: [{ id: NUDGE_ID }, { id: RECAP_ID }] });
    if (plan.length) await plugin.schedule({ notifications: plan.map(toNotification) });
    return key;
  } catch {
    return lastKey;
  }
}

/** Reminders are offered once, in the iPhone app, after the first full day (same moment as the sign-in card). */
export function shouldPromptReminders(state: AppState, today: YMD, native: boolean): boolean {
  if (!native || state.ui.notificationsPrompted || state.settings.nudge || state.settings.recap) return false;
  return shouldPromptSignIn({ ...state, ui: { ...state.ui, signInPrompted: false } }, today, { configured: true, signedIn: false });
}

export type HapticStep = { impact: "light" | "medium" } | { notify: "success" | "warning" } | { wait: number };

export function hapticSteps(event: FeedbackEvent): HapticStep[] {
  switch (event) {
    case "check": return [{ impact: "light" }];
    case "fullBloom": return [{ notify: "success" }];
    case "remove": return [{ notify: "warning" }];
    case "visitor": return [{ impact: "medium" }, { wait: 160 }, { impact: "medium" }];
  }
}
