import { describe, expect, it } from "vitest";
import type { AppState } from "../types";
import { ARC, C, D, FIX_TODAY, fixtureState } from "./fixtures/arc14";
import { NUDGE_ID, RECAP_ID, applyPlan, hapticSteps, nudgePlan, shouldPromptReminders, toNotification } from "./nudges";

const on = (s: AppState, patch: Partial<AppState["settings"]>): AppState => ({ ...s, settings: { ...s.settings, ...patch } });
const at = (h: number, m = 0): Date => new Date(2026, 9, 14, h, m); // local time on FIX_TODAY

describe("8pm nudge (SPEC 11)", () => {
  it("chain 2, today not kept, before 20:00: one nudge today at 20:00 with the chain in the text", () => {
    expect(nudgePlan(on(fixtureState(), { nudge: true }), FIX_TODAY, at(12))).toEqual([
      { id: NUDGE_ID, title: "Grove", body: "Your chain is at 2. A few habits left.", at: { day: FIX_TODAY, hour: 20, minute: 0 } },
    ]);
  });
  it("once today is kept, today's nudge goes and tomorrow's is planned with the longer chain", () => {
    const s = on(fixtureState(), { nudge: true });
    s.logs[`${ARC}:${FIX_TODAY}`] = { ...s.logs[`${ARC}:${FIX_TODAY}`]!, completedHabitIds: ["h-alpha", C, D] };
    expect(nudgePlan(s, FIX_TODAY, at(12))).toEqual([
      { id: NUDGE_ID, title: "Grove", body: "Your chain is at 3. A few habits left.", at: { day: "2026-10-15", hour: 20, minute: 0 } },
    ]);
  });
  it("never on a day with nothing to do", () => {
    // Every habit ends yesterday: nothing is due today, while the chain (Oct 12, 13) is still 2.
    const s = on(fixtureState(), { nudge: true });
    s.habits = s.habits.map((h) => (h.archivedAt === undefined ? { ...h, archivedAt: FIX_TODAY } : h));
    expect(nudgePlan(s, FIX_TODAY, at(12))).toEqual([]);
  });
  it("not in the last minutes before 20:00 (iOS refuses a time already past), nor after 20:00 when today is open", () => {
    expect(nudgePlan(on(fixtureState(), { nudge: true }), FIX_TODAY, at(19, 59))).toEqual([]);
    expect(nudgePlan(on(fixtureState(), { nudge: true }), FIX_TODAY, at(20, 1))).toEqual([]);
  });
  it("none with the toggle off, or below a chain of 2", () => {
    expect(nudgePlan(fixtureState(), FIX_TODAY, at(12))).toEqual([]);
    const s = on(fixtureState(), { nudge: true });
    delete s.logs[`${ARC}:2026-10-12`]; // chain drops to 1
    expect(nudgePlan(s, FIX_TODAY, at(12))).toEqual([]);
  });
  it("none for a finished arc or with no arc", () => {
    expect(nudgePlan(on(fixtureState(), { nudge: true }), "2026-10-19", new Date(2026, 9, 19, 12))).toEqual([]);
    expect(nudgePlan({ ...on(fixtureState(), { nudge: true }), activeArcId: null }, FIX_TODAY, at(12))).toEqual([]);
  });
});

describe("Sunday recap note", () => {
  it("weekly, Sunday 18:00, while an arc runs", () => {
    expect(nudgePlan(on(fixtureState(), { recap: true }), FIX_TODAY, at(12))).toEqual([
      { id: RECAP_ID, title: "Grove", body: "Your week in the garden is ready", weekly: { weekday: 1, hour: 18, minute: 0 } },
    ]);
    expect(nudgePlan({ ...on(fixtureState(), { recap: true }), activeArcId: null }, FIX_TODAY, at(12))).toEqual([]);
  });
});

describe("reminders prompt", () => {
  it("not when a reminder is already on", () => {
    expect(shouldPromptReminders(on(fixtureState(), { nudge: true }), FIX_TODAY, true)).toBe(false);
    expect(shouldPromptReminders(on(fixtureState(), { recap: true }), FIX_TODAY, true)).toBe(false);
  });
  it("only in the iPhone app, once, after the first full day", () => {
    expect(shouldPromptReminders(fixtureState(), FIX_TODAY, true)).toBe(true);
    expect(shouldPromptReminders(fixtureState(), FIX_TODAY, false)).toBe(false);
    const s = fixtureState();
    expect(shouldPromptReminders({ ...s, ui: { ...s.ui, notificationsPrompted: true } }, FIX_TODAY, true)).toBe(false);
    expect(shouldPromptReminders({ ...s, logs: {} }, FIX_TODAY, true)).toBe(false);
  });
});

describe("haptics (SPEC 11)", () => {
  it("maps each moment to its feel", () => {
    expect(hapticSteps("check")).toEqual([{ impact: "light" }]);
    expect(hapticSteps("fullBloom")).toEqual([{ notify: "success" }]);
    expect(hapticSteps("remove")).toEqual([{ notify: "warning" }]);
    expect(hapticSteps("visitor")).toEqual([{ impact: "medium" }, { wait: 160 }, { impact: "medium" }]);
  });
});

describe("turning the plan into notifications", () => {
  it("a day's nudge is at local 20:00 that day; the recap repeats on Sundays", () => {
    const n = toNotification({ id: NUDGE_ID, title: "Grove", body: "b", at: { day: "2026-11-01", hour: 20, minute: 0 } });
    const when = (n.schedule as { at: Date }).at;
    expect([when.getFullYear(), when.getMonth(), when.getDate(), when.getHours(), when.getMinutes()]).toEqual([2026, 10, 1, 20, 0]);
    expect(toNotification({ id: RECAP_ID, title: "Grove", body: "b", weekly: { weekday: 1, hour: 18, minute: 0 } }).schedule).toEqual({ on: { weekday: 1, hour: 18, minute: 0 }, allowWhileIdle: true });
  });

  it("replaces pending notes only when the plan changed, and retries after a failure", async () => {
    const calls: string[] = [];
    let fail = true;
    const plugin = {
      cancel: async () => void calls.push("cancel"),
      schedule: async () => {
        calls.push("schedule");
        if (fail) throw new Error("time in the past");
      },
    };
    const plan = nudgePlan(on(fixtureState(), { nudge: true, recap: true }), FIX_TODAY, at(12));
    let last = await applyPlan(plugin, plan, "");
    expect(last).toBe(""); // failed: not remembered, so the next pass tries again
    fail = false;
    last = await applyPlan(plugin, plan, last);
    expect(calls).toEqual(["cancel", "schedule", "cancel", "schedule"]);
    expect(await applyPlan(plugin, plan, last)).toBe(last);
    expect(calls).toHaveLength(4); // unchanged plan: no calls
  });
});
