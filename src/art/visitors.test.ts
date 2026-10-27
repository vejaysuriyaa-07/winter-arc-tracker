import { describe, expect, it } from "vitest";
import { ALL_VISITORS } from "../lib/visitors";
import { VISITOR_ART } from "./visitors";

describe("visitor art", () => {
  it("every visitor has art: three paths, three colours, inside 64x64", () => {
    expect(ALL_VISITORS).toHaveLength(36);
    for (const v of ALL_VISITORS) {
      const a = VISITOR_ART[v.id];
      expect(a, v.id).toBeDefined();
      for (const c of [a!.c1, a!.c2, a!.c3]) expect(c).toMatch(/^#[0-9A-F]{6}$/i);
      for (const d of [a!.d1, a!.d2, a!.d3]) {
        expect(d.startsWith("M")).toBe(true);
        const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
        for (const n of nums) {
          expect(n, `${v.id} coordinate ${n}`).toBeGreaterThanOrEqual(-1);
          expect(n, `${v.id} coordinate ${n}`).toBeLessThanOrEqual(64);
        }
      }
    }
    expect(Object.keys(VISITOR_ART).sort()).toEqual(ALL_VISITORS.map((v) => v.id).sort());
  });
});
