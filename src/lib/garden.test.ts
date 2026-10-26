import { describe, expect, it } from "vitest";
import { MOODS, SEASONS } from "../types";
import { A, B, C, D, FIX_TODAY, Z, fixtureState } from "./fixtures/arc14";
import * as g from "./garden";

describe("growth", () => {
  it("fullGrowthDays = max(7, round(len * 0.78))", () => {
    expect(g.fullGrowthDays(90)).toBe(70);
    expect(g.fullGrowthDays(30)).toBe(23);
    expect(g.fullGrowthDays(14)).toBe(11);
    expect(g.fullGrowthDays(5)).toBe(7);
  });
  it("g = min(1, daysDone / fullGrowthDays)", () => {
    expect(g.growth(0, 90)).toBe(0);
    expect(g.growth(35, 90)).toBe(0.5);
    expect(g.growth(200, 90)).toBe(1);
  });
});

describe("plantShape (port of Garden.dc.html)", () => {
  const pal = g.SCENE_PALETTES.spring;
  it("seed mound at g=0", () => {
    const s = g.plantShape(0, false, false, pal);
    expect(s.trunk).toBe("M0 0");
    expect(s.r1).toBe("0");
  });
  it("sprout under 0.08", () => {
    const s = g.plantShape(0.05, false, false, pal);
    expect(s.trunk).toMatch(/^M60 157L60 /);
    expect(s.sprout).not.toBe("M0 0");
    expect(g.plantShape(0.05, true, false, pal).sprout).toBe("M0 0");
  });
  it("trunk height 10 + g*125", () => {
    const s = g.plantShape(0.5, false, false, pal);
    // top of trunk T = 157 - (10 + 62.5) = 84.5
    expect(s.trunk.endsWith(" 60 84.5")).toBe(true);
    expect(s.r1).toBe("17.0"); // 5 + 0.5 * 24
    expect(Number(s.r2)).toBeGreaterThan(0); // g > 0.25
    expect(s.r4).toBe("0"); // g <= 0.55
  });
  it("pines have three tiers and a snow cap unless wilted", () => {
    const pine = g.plantShape(0.8, false, true, g.SCENE_PALETTES.winter);
    expect([pine.t1, pine.t2, pine.t3, pine.cap].every((p) => p.startsWith("M"))).toBe(true);
    expect(pine.cap).not.toBe("M0 0");
    expect(g.plantShape(0.8, true, true, g.SCENE_PALETTES.winter).cap).toBe("M0 0");
  });
  it("wilting turns brown and shrinks the canopy", () => {
    const w = g.plantShape(0.8, true, false, pal);
    expect(w.trunkColor).toBe("#8B7765");
    expect(w.leafA).toBe("#7C6A58");
    expect(Number(w.r1)).toBeCloseTo((5 + 0.8 * 24) * 0.65, 0);
  });
});

describe("plant slots", () => {
  it("uses the design's nine slots", () => {
    const s = g.plantSlots(9);
    expect(s.map((x) => x.x)).toEqual([34, 70, 108, 146, 182, 222, 256, 298, 328]);
    expect(s.filter((x) => x.row === "back")).toHaveLength(5);
  });
  it("spreads fewer plants across the slots", () => {
    expect(g.plantSlots(1).map((x) => x.x)).toEqual([182]);
    expect(g.plantSlots(3).map((x) => x.x)).toEqual([70, 182, 298]);
  });
  it("never overlaps bases in the same row, up to 30 habits", () => {
    for (let n = 1; n <= 30; n++) {
      const slots = g.plantSlots(n);
      expect(slots).toHaveLength(n);
      for (const row of ["back", "front"] as const) {
        const r = slots.filter((s) => s.row === row).sort((a, b) => a.x - b.x);
        for (let i = 1; i < r.length; i++) {
          const gap = r[i]!.x - r[i - 1]!.x;
          const halfA = g.MAX_MOUND_RX * r[i - 1]!.s;
          const halfB = g.MAX_MOUND_RX * r[i]!.s;
          expect(gap).toBeGreaterThanOrEqual(halfA + halfB);
        }
      }
    }
  });
});

describe("flowers", () => {
  it("five wildflowers from day 1, one more per kept day, gold centers for full days", () => {
    const f0 = g.flowerLayout([], "spring");
    expect(f0).toHaveLength(5);
    expect(f0.every((f) => !f.gold)).toBe(true);
    const f = g.flowerLayout([{ full: true }, { full: false }, { full: true }], "spring");
    expect(f).toHaveLength(8);
    expect(f.filter((x) => x.gold)).toHaveLength(2);
  });
  it("positions are seeded by index and never move", () => {
    const a = g.flowerLayout([{ full: true }], "winter");
    const b = g.flowerLayout([{ full: true }, { full: false }], "winter");
    expect(b.slice(0, 6).map((x) => [x.x, x.y])).toEqual(a.map((x) => [x.x, x.y]));
  });
});

describe("birds, weather, sky", () => {
  it("birds by arc progress", () => {
    expect([0, 0.14, 0.15, 0.34, 0.35, 0.59, 0.6, 0.89, 0.9, 1].map(g.birdCount)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 5, 5]);
  });
  it("weather by mood (winter snows)", () => {
    expect(g.weather("winter", "great", g.NO_EVENTS)).toMatchObject({ clouds: 0, drops: 8, precip: "snow", wind: 1 });
    expect(g.weather("winter", "rough", g.NO_EVENTS)).toMatchObject({ clouds: 5, drops: 46, wind: 2.2 });
    expect(g.weather("summer", "good", g.NO_EVENTS)).toMatchObject({ clouds: 2, drops: 0, precip: "rain" });
    expect(g.weather("autumn", "low", g.NO_EVENTS)).toMatchObject({ clouds: 5, drops: 30, wind: 1.5 });
    expect(g.weather("spring", "rough", { ...g.NO_EVENTS, rainbow: true })).toMatchObject({ clouds: 2, drops: 0 });
    expect(g.weather("winter", "okay", { ...g.NO_EVENTS, night: true })).toMatchObject({ clouds: 0, drops: 10 });
  });
  it("sky per season x mood, night and rainbow override", () => {
    expect(g.skyColors("winter", "good", g.NO_EVENTS)).toEqual(["#5A8DC2", "#C3DBF0"]);
    expect(g.skyColors("autumn", "rough", g.NO_EVENTS)).toEqual(["#2E2A28", "#5C5552"]);
    expect(g.skyColors("spring", "rough", { ...g.NO_EVENTS, night: true })).toEqual(["#060B1E", "#22305A"]);
    expect(g.skyColors("spring", "rough", { ...g.NO_EVENTS, rainbow: true })).toEqual(["#7FA9CC", "#E6F0F7"]);
  });
});

describe("scene model", () => {
  const S = fixtureState();
  const arc = S.arcs[0]!;
  it("plants one per habit existing by the day, sized by days done, archived ones wilted", () => {
    const m = g.gardenFromState(S, arc, FIX_TODAY, g.NO_EVENTS);
    expect(m.plants.map((p) => p.id)).toEqual([A, B, C, D]); // Z not created yet, deleted X dropped
    const a = m.plants.find((p) => p.id === A)!;
    expect(a.g).toBeCloseTo(9 / 11);
    expect(m.plants.find((p) => p.id === B)!.wilt).toBe(true);
    expect(m.plants.find((p) => p.id === B)!.lean).toBe(9);
    expect(m.plants.find((p) => p.id === C)!.wilt).toBe(false);
    void Z;
  });
  it("re-renders at an earlier day (timelapse)", () => {
    const m = g.gardenFromState(S, arc, "2026-10-07", g.NO_EVENTS);
    expect(m.plants.map((p) => p.id)).toEqual([A, B, C]);
    expect(m.plants.find((p) => p.id === B)!.wilt).toBe(false);
    expect(m.plants.find((p) => p.id === A)!.g).toBeCloseTo(3 / 11);
    expect(m.flowers).toHaveLength(5 + 2); // d1 and d3 kept
  });
  it("flowers per kept day so far, bloom only when that day is full", () => {
    const m = g.gardenFromState(S, arc, FIX_TODAY, g.NO_EVENTS);
    expect(m.flowers).toHaveLength(5 + 6);
    expect(m.bloom).toBe(false);
    expect(g.gardenFromState(S, arc, "2026-10-13", g.NO_EVENTS).bloom).toBe(true);
  });
  it("uses the day's mood, defaulting to good", () => {
    expect(g.gardenFromState(S, arc, "2026-10-09", g.NO_EVENTS).mood).toBe("low");
    expect(g.gardenFromState(S, arc, FIX_TODAY, g.NO_EVENTS).mood).toBe("good");
  });
  it("before the start shows seed mounds only", () => {
    const m = g.gardenFromState(S, arc, "2026-10-01", g.NO_EVENTS);
    expect(m.plants.every((p) => p.g === 0)).toBe(true);
    expect(m.plants.map((p) => p.id)).toEqual([A, B, C, D, Z]);
    expect(m.birds).toHaveLength(0);
    expect(m.flowers).toHaveLength(5);
  });
  it("day 1 is seeds and wildflowers; the last day has a flock", () => {
    const fresh = fixtureState();
    fresh.logs = {};
    const day1 = g.gardenFromState(fresh, arc, arc.startDate, g.NO_EVENTS);
    expect(day1.plants.every((p) => p.g === 0)).toBe(true);
    expect(day1.flowers).toHaveLength(5);
    expect(day1.birds).toHaveLength(0);
    expect(g.gardenFromState(S, arc, "2026-10-18", g.NO_EVENTS).birds).toHaveLength(5);
  });
  it("keeps the cap with a very large garden at night", () => {
    const m = g.sceneModel({
      season: "summer", mood: "rough", events: { ...g.NO_EVENTS, night: true, aurora: true, brightStars: true, fireflies: true },
      lengthDays: 90, dayNumber: 90,
      plants: Array.from({ length: 120 }, (_, i) => ({ id: `p${i}`, daysDone: i, wilt: false })),
      keptDays: [], bloom: false,
    });
    expect(m.plants).toHaveLength(120); // every habit keeps its plant
    expect(m.animatedNodes).toBeLessThanOrEqual(150);
  });
  it("caps animated nodes at 150 for every season, mood and event, even with 30 habits", () => {
    const events = [g.NO_EVENTS, { ...g.NO_EVENTS, night: true, fireflies: true }, { ...g.NO_EVENTS, night: true, aurora: true, brightStars: true }, { ...g.NO_EVENTS, rainbow: true }];
    for (const season of SEASONS)
      for (const mood of MOODS)
        for (const ev of events) {
          const m = g.sceneModel({
            season, mood, events: ev, lengthDays: 90, dayNumber: 90,
            plants: Array.from({ length: 30 }, (_, i) => ({ id: `p${i}`, daysDone: i * 3, wilt: i % 7 === 0 })),
            keptDays: Array.from({ length: 90 }, (_, i) => ({ full: i % 2 === 0 })),
            bloom: true,
          });
          expect(m.animatedNodes).toBeLessThanOrEqual(150);
        }
  });
});
