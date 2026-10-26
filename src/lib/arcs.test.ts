import { describe, expect, it } from "vitest";
import { ARC, FIX_TODAY, fixtureState } from "./fixtures/arc14";
import { arcStatus, arcSummary, arcToCelebrate, LOOK_NAMES, themeLabel } from "./arcs";

describe("arc status", () => {
  const S = fixtureState();
  const arc = S.arcs[0]!;
  it("active: day X of Y with progress", () => {
    expect(arcStatus(S, arc, FIX_TODAY)).toEqual({ kind: "active", label: "Day 10 of 14", progress: 10 / 14 });
  });
  it("before: starts on", () => {
    expect(arcStatus(S, arc, "2026-10-01")).toEqual({ kind: "before", label: "Starts Oct 5", progress: 0 });
  });
  it("finished: with its score", () => {
    // After the arc: 24 done of 31 + days d11..d14 scheduled 3 each with nothing done -> 24 / 43 = 55.8%
    expect(arcStatus(S, arc, "2026-11-01")).toEqual({ kind: "finished", label: "Finished, 56%", progress: 1 });
  });
});

describe("arc complete", () => {
  it("celebrates a finished arc once, never before it ends", () => {
    const S = fixtureState();
    expect(arcToCelebrate(S, "2026-10-18")).toBeNull(); // the last day is still running
    expect(arcToCelebrate(S, "2026-10-19")?.id).toBe(ARC);
    S.ui.celebrated[`arc:${ARC}`] = true;
    expect(arcToCelebrate(S, "2026-10-19")).toBeNull();
  });
  it("ignores deleted arcs", () => {
    const S = fixtureState();
    S.arcs[0]!.deleted = true;
    expect(arcToCelebrate(S, "2026-10-19")).toBeNull();
  });
  it("summary numbers", () => {
    const S = fixtureState();
    S.visitors.push({ id: "v1", arcId: ARC, visitorId: "winter-robin", foundOn: "2026-10-07", updatedAt: "2026-10-07T00:00:00.000Z" });
    expect(arcSummary(S, S.arcs[0]!, "2026-10-19")).toEqual({ score: 24 / 43 * 100, bestChain: 3, visitors: 1, fullDays: 6, keptDays: 6, days: 14 });
  });
});

describe("labels", () => {
  it("look names and theme label", () => {
    expect(LOOK_NAMES).toEqual({ journal: "Field journal", greenhouse: "Greenhouse", night: "Night" });
    expect(themeLabel("journal", "winter")).toBe("Field journal, winter");
    expect(themeLabel("night", "autumn")).toBe("Night, autumn");
  });
});

describe("imports never celebrate on load", () => {
  it("marks arcs finished at import time", async () => {
    const { markFinishedCelebrated } = await import("./arcs");
    const S = fixtureState();
    expect(markFinishedCelebrated(S, FIX_TODAY)).toBe(S); // still running
    expect(markFinishedCelebrated(S, "2026-10-19").ui.celebrated).toEqual({ [`arc:${ARC}`]: true });
  });
});

describe("default season for a new arc", () => {
  it("follows the calendar month (northern seasons)", async () => {
    const { seasonForDay } = await import("./arcs");
    expect(["2026-12-01", "2027-01-15", "2027-02-28"].map(seasonForDay)).toEqual(["winter", "winter", "winter"]);
    expect(["2026-03-01", "2026-05-31"].map(seasonForDay)).toEqual(["spring", "spring"]);
    expect(["2026-06-01", "2026-08-31"].map(seasonForDay)).toEqual(["summer", "summer"]);
    expect(["2026-09-01", "2026-10-26", "2026-11-30"].map(seasonForDay)).toEqual(["autumn", "autumn", "autumn"]);
  });
});

describe("frozen arcs", () => {
  it("an arc frozen elsewhere (synced) never celebrates", () => {
    const S = fixtureState();
    S.arcs[0]!.frozenAt = "2026-10-19T08:00:00.000Z";
    expect(arcToCelebrate(S, "2026-10-20")).toBeNull();
  });
});
