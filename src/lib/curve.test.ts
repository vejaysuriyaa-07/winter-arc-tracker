import { describe, expect, it } from "vitest";
import { catmullRomPath } from "./curve";

describe("catmullRomPath", () => {
  it("handles empty, single and double point inputs", () => {
    expect(catmullRomPath([])).toBe("");
    expect(catmullRomPath([{ x: 1, y: 2 }])).toBe("M1,2");
    const two = catmullRomPath([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
    expect(two.startsWith("M0,0 C")).toBe(true);
    expect(two.endsWith(" 10,10")).toBe(true);
  });
  it("passes through every input point with one cubic per segment", () => {
    const pts = [{ x: 0, y: 50 }, { x: 10, y: 0 }, { x: 20, y: 100 }, { x: 30, y: 50 }];
    const d = catmullRomPath(pts);
    const segs = d.split(" C");
    expect(segs).toHaveLength(4); // M + 3 segments
    segs.slice(1).forEach((seg, k) => {
      const end = seg.split(" ")[2];
      expect(end).toBe(`${pts[k + 1]!.x},${pts[k + 1]!.y}`);
    });
  });
  it("keeps a straight line straight", () => {
    const d = catmullRomPath([{ x: 0, y: 10 }, { x: 10, y: 10 }, { x: 20, y: 10 }]);
    const ys = [...d.matchAll(/,([\d.]+)/g)].map((m) => Number(m[1]));
    expect(ys.every((y) => y === 10)).toBe(true);
  });
});
