// Rare skies (SPEC 7.4) from real triggers. Pure: `today` and `now` are passed in.
import type { AppState, Arc } from "../types";
import { NO_EVENTS, type SkyEvents } from "./garden";
import { diffDays, type YMD } from "./dates";
import { addDays } from "./dates";
import { isFull, logOf, perfectWeeks } from "./stats";

export function isNightHour(now: Date): boolean {
  const h = now.getHours();
  return h >= 19 || h < 6;
}

/** `shootingStar` is decided by the caller (it crosses once when that visitor is found). */
export function skyEvents(state: AppState, arc: Arc, today: YMD, now: Date, shootingStar = false): SkyEvents {
  const night = isNightHour(now);
  const full = isFull(state, arc, today);
  const warm = arc.season === "spring" || arc.season === "summer";
  const mood = logOf(state, arc.id, today)?.mood;
  // A perfect week ends on its Sunday; the lights show that night and for 7 days after.
  const aurora =
    night &&
    arc.season === "winter" &&
    perfectWeeks(state, arc, today).some((mon) => {
      const d = diffDays(addDays(mon, 6), today);
      return d >= 0 && d <= 7;
    });
  return {
    ...NO_EVENTS,
    night,
    fireflies: night && full && warm,
    brightStars: night && full && !warm,
    aurora,
    rainbow: !night && full && (mood === "low" || mood === "rough"),
    shootingStar,
  };
}
