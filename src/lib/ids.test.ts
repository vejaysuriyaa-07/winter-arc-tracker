import { describe, expect, it } from "vitest";
import { stableId } from "./ids";
import * as m from "./mutations";
import { fixtureState, ARC, A, FIX_NOW } from "./fixtures/arc14";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("stableId", () => {
  it("is a uuid, the same for the same key and different for different keys", () => {
    expect(stableId("log:a:2026-10-01")).toMatch(UUID);
    expect(stableId("log:a:2026-10-01")).toBe(stableId("log:a:2026-10-01"));
    const many = new Set(Array.from({ length: 2000 }, (_, i) => stableId(`log:a:${i}`)));
    expect(many.size).toBe(2000);
  });

  it("a new day log gets the same id on every device", () => {
    const s = fixtureState();
    const a = m.toggleHabit(s, FIX_NOW, ARC, "2026-10-15", A);
    const b = m.toggleHabit(fixtureState(), FIX_NOW, ARC, "2026-10-15", A);
    expect(a.logs[`${ARC}:2026-10-15`]!.id).toBe(b.logs[`${ARC}:2026-10-15`]!.id);
  });

  it("the same visitor found on two devices gets the same id", () => {
    const a = m.addVisitor(fixtureState(), FIX_NOW, ARC, "robin", "2026-10-14");
    const b = m.addVisitor(fixtureState(), FIX_NOW, ARC, "robin", "2026-10-14");
    expect(a.visitors.at(-1)!.id).toBe(b.visitors.at(-1)!.id);
  });
});
