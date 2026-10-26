import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useToday source", () => {
  it("re-checks the day when the first subscriber arrives, not only on the next tick", async () => {
    vi.setSystemTime(new Date(2026, 10, 3, 23, 59, 0));
    const mod = await import("./today");
    expect(mod.currentDay()).toBe("2026-11-03");
    vi.setSystemTime(new Date(2026, 10, 4, 0, 1, 0));
    expect(mod.currentDay()).toBe("2026-11-03"); // nothing has checked yet
    const unsub = mod.subscribeToday(() => {});
    expect(mod.currentDay()).toBe("2026-11-04");
    unsub();
  });
  it("rolls over on the minute poll and notifies", async () => {
    vi.setSystemTime(new Date(2026, 10, 3, 23, 59, 30));
    const mod = await import("./today");
    const seen: string[] = [];
    mod.subscribeToday(() => seen.push(mod.currentDay()));
    vi.setSystemTime(new Date(2026, 10, 4, 0, 0, 30));
    vi.advanceTimersByTime(60_000);
    expect(seen).toEqual(["2026-11-04"]);
  });
});
