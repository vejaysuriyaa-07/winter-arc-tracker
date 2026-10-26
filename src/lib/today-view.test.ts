import { describe, expect, it } from "vitest";
import { ARC, A, C, D, FIX_TODAY, fixtureState } from "./fixtures/arc14";
import { bloomKey, iconFor, moodLabel, shouldPlayFullBloom, todayView } from "./today-view";

describe("streak icons (SPEC 4.2)", () => {
  it("seed at 0, sprout 1-6, flame from 7", () => {
    expect(iconFor(0, "good", "spring").kind).toBe("seed");
    expect(iconFor(1, "good", "spring").kind).toBe("sprout");
    expect(iconFor(6, "good", "spring").kind).toBe("sprout");
    expect(iconFor(7, "good", "spring").kind).toBe("flame");
  });
  it("weather overlays by mood", () => {
    expect(iconFor(3, "great", "spring")).toMatchObject({ spark: true, cloud: false, drop: false, flake: false, bolt: false });
    expect(iconFor(3, "good", "spring")).toMatchObject({ spark: false, cloud: false, drop: false, bolt: false, wind: 1 });
    expect(iconFor(3, "okay", "spring")).toMatchObject({ cloud: true });
    expect(iconFor(3, "low", "summer")).toMatchObject({ drop: true, flake: false, wet: true });
    expect(iconFor(3, "low", "winter")).toMatchObject({ drop: false, flake: true });
    expect(iconFor(9, "rough", "autumn")).toMatchObject({ drop: true, bolt: true, rough: true, wind: 2.3 });
    expect(iconFor(0, "low", "summer").drop).toBe(false); // no drip on a bare seed
  });
});

describe("mood labels", () => {
  it("snow in winter, rain elsewhere", () => {
    expect(moodLabel("good", "winter")).toBe("Good, clear skies");
    expect(moodLabel("low", "winter")).toBe("Low, snowing");
    expect(moodLabel("rough", "winter")).toBe("Rough, blizzard");
    expect(moodLabel("low", "spring")).toBe("Low, rainy");
    expect(moodLabel("rough", "summer")).toBe("Rough, stormy");
  });
});

describe("full bloom fires once, only on a live transition", () => {
  const key = bloomKey(ARC, FIX_TODAY);
  it("plays when the day turns full and was not celebrated", () => {
    expect(shouldPlayFullBloom(false, true, key, {})).toBe(true);
  });
  it("never on load (no transition) and never twice", () => {
    expect(shouldPlayFullBloom(true, true, key, {})).toBe(false);
    expect(shouldPlayFullBloom(false, true, key, { [key]: true })).toBe(false);
    expect(shouldPlayFullBloom(true, false, key, {})).toBe(false);
  });
});

describe("today view", () => {
  it("rows, counts and streaks for the arc's day", () => {
    const v = todayView(fixtureState(), fixtureState().arcs[0]!, FIX_TODAY);
    expect(v.phase).toBe("active");
    expect(v.rows.map((r) => [r.habit.id, r.done, r.streak])).toEqual([[A, true, 4], [C, false, 3], [D, false, 2]]);
    expect(v.done).toBe(1);
    expect(v.total).toBe(3);
    expect(v.percent).toBeCloseTo(100 / 3);
    expect(v.mood).toBe("good");
    expect(v.chain).toBe(2);
  });
  it("before the start: rows from day 1, nothing checkable, countdown", () => {
    const v = todayView(fixtureState(), fixtureState().arcs[0]!, "2026-10-02");
    expect(v.phase).toBe("before");
    expect(v.startsIn).toBe(3);
    expect(v.rows.map((r) => r.habit.id)).toEqual([A, "h-bravo", C]);
  });
});
