// Physical feedback for app events (SPEC 11). Every call respects the Settings
// toggle. The web build has no haptics; the native build swaps in Capacitor
// Haptics through `setFeedbackDriver` (phase 8).
export type FeedbackEvent = "check" | "fullBloom" | "remove" | "visitor";

type Driver = (event: FeedbackEvent) => void;

let driver: Driver = () => {};

export function setFeedbackDriver(d: Driver): void {
  driver = d;
}

export function feedback(event: FeedbackEvent, enabled: boolean): void {
  if (!enabled) return;
  try {
    driver(event);
  } catch {
    // feedback is best effort
  }
}
