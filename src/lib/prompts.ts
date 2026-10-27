// One-time prompts (pure).
import type { AppState } from "../types";
import type { YMD } from "./dates";
import { fullDays } from "./stats";

/** The sign-in card shows once, after the first full day in any arc, while signed out (SPEC 5.11). */
export function shouldPromptSignIn(state: AppState, today: YMD, sync: { configured: boolean; signedIn: boolean }): boolean {
  if (!sync.configured || sync.signedIn || state.ui.signInPrompted) return false;
  return state.arcs.some((a) => !a.deleted && fullDays(state, a, today) > 0);
}
