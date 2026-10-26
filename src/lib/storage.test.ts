import { beforeEach, describe, expect, it } from "vitest";
import { fixtureState } from "./fixtures/arc14";
import {
  BACKUP_UNREADABLE_KEY,
  BACKUP_V1_KEY,
  STORAGE_KEY,
  defaultState,
  load,
  memoryAdapter,
  parseImport,
  save,
  serialize,
  validateState,
} from "./storage";

const TODAY = "2026-10-26";
const NOW = "2026-10-26T10:00:00.000Z";

function v1Blob() {
  return JSON.stringify({
    version: 1,
    settings: { startDate: "2026-10-05", lengthDays: 90, streakThreshold: 80, sleepTargetHours: 8 },
    habits: [{ id: "h1", name: "Read", category: "mind", order: 0, createdAt: "2026-10-05" }],
    logs: { "2026-10-05": { date: "2026-10-05", completedHabitIds: ["h1"] } },
    goals: [],
    ui: { lastCelebratedLevel: 1 },
  });
}

describe("defaultState", () => {
  it("has no arcs and no fake data", () => {
    const s = defaultState(NOW);
    expect(s.version).toBe(3);
    expect(s.arcs).toEqual([]);
    expect(s.activeArcId).toBeNull();
    expect(s.habits).toEqual([]);
    expect(s.logs).toEqual({});
    expect(s.settings.updatedAt).toBe(NOW);
  });
});

describe("validateState", () => {
  it("accepts the fixture and strips unknown fields", () => {
    const r = validateState({ ...fixtureState(), extra: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state).not.toHaveProperty("extra");
  });
  it("migrates a v1 object", () => {
    const r = validateState(JSON.parse(v1Blob()), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.arcs[0]!.name).toBe("Winter Arc");
  });
  const bad: [string, (s: ReturnType<typeof fixtureState>) => unknown][] = [
    ["unknown version", (s) => ({ ...s, version: 2 })],
    ["log key mismatch", (s) => ({ ...s, logs: { "nope:2026-10-05": Object.values(s.logs)[0] } })],
    ["habit with unknown arc", (s) => ({ ...s, habits: [{ ...s.habits[0]!, arcId: "ghost" }] })],
    ["duplicate habit id", (s) => ({ ...s, habits: [s.habits[0]!, s.habits[0]!] })],
    ["bad season", (s) => ({ ...s, arcs: [{ ...s.arcs[0]!, season: "monsoon" }] })],
    ["bad look", (s) => ({ ...s, arcs: [{ ...s.arcs[0]!, look: "neon" }] })],
    ["threshold out of range", (s) => ({ ...s, arcs: [{ ...s.arcs[0]!, threshold: 120 }] })],
    ["archived before created", (s) => ({ ...s, habits: [{ ...s.habits[0]!, archivedAt: "2026-01-01" }] })],
    ["bad mood", (s) => ({ ...s, logs: { [Object.keys(s.logs)[0]!]: { ...Object.values(s.logs)[0]!, mood: "meh" } } })],
    ["active arc unknown", (s) => ({ ...s, activeArcId: "ghost" })],
    ["sync op bad table", (s) => ({ ...s, sync: { queue: [{ table: "cats", id: "x", at: NOW }] } })],
    ["not an object", () => "nope"],
  ];
  for (const [name, make] of bad) {
    it(`rejects ${name}`, () => {
      expect(validateState(make(fixtureState())).ok).toBe(false);
    });
  }
  it("drops check-offs of unknown habits", () => {
    const s = fixtureState();
    const k = Object.keys(s.logs)[1]!;
    s.logs[k]!.completedHabitIds.push("ghost");
    const r = validateState(s);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.logs[k]!.completedHabitIds).not.toContain("ghost");
  });
});

describe("load and save", () => {
  let mem: ReturnType<typeof memoryAdapter>;
  beforeEach(() => {
    mem = memoryAdapter();
  });
  it("returns defaults when empty", async () => {
    const s = await load(mem, TODAY, NOW);
    expect(s.arcs).toEqual([]);
  });
  it("round trips", async () => {
    expect(await save(mem, fixtureState())).toBe(true);
    const s = await load(mem, TODAY, NOW);
    expect(s.arcs[0]!.name).toBe("Winter Arc");
    expect(await mem.get(STORAGE_KEY)).not.toBeNull();
  });
  it("migrates a stored v1 blob and parks the raw data once", async () => {
    await mem.set("winter-arc:v1", v1Blob());
    const s = await load(mem, TODAY, NOW);
    expect(s.arcs[0]!.name).toBe("Winter Arc");
    expect(await mem.get(BACKUP_V1_KEY)).toBe(v1Blob());
    // The old key stays until the v3 copy is safely saved; the v3 key wins from then on.
    expect(await mem.get("winter-arc:v1")).toBe(v1Blob());
    // second load after a save keeps the first backup
    await save(mem, s);
    await mem.set("winter-arc:v1", "{}");
    await load(mem, TODAY, NOW);
    expect(await mem.get(BACKUP_V1_KEY)).toBe(v1Blob());
  });
  it("parks unreadable data and returns defaults", async () => {
    await mem.set(STORAGE_KEY, "{not json");
    const s = await load(mem, TODAY, NOW);
    expect(s.arcs).toEqual([]);
    expect(await mem.get(BACKUP_UNREADABLE_KEY + ":" + NOW)).toBe("{not json");
  });
  it("keeps every unreadable blob it parks", async () => {
    await mem.set(STORAGE_KEY, "{one");
    await load(mem, TODAY, NOW);
    await mem.set(STORAGE_KEY, "{two");
    await load(mem, TODAY, "2026-10-27T10:00:00.000Z");
    expect(await mem.get(BACKUP_UNREADABLE_KEY + ":" + NOW)).toBe("{one");
    expect(await mem.get(BACKUP_UNREADABLE_KEY + ":2026-10-27T10:00:00.000Z")).toBe("{two");
  });
  it("a read error is reported, never turned into defaults", async () => {
    const bad = { ...mem, get: async () => { throw new Error("blocked"); } };
    await expect(load(bad, TODAY, NOW)).rejects.toThrow("blocked");
  });
  it("save returns false when the adapter throws", async () => {
    const bad = { ...mem, set: async () => { throw new Error("quota"); } };
    expect(await save(bad, fixtureState())).toBe(false);
  });
});

describe("export and import", () => {
  it("serialize then parseImport is identity", () => {
    const r = parseImport(serialize(fixtureState()), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state).toEqual(fixtureState());
  });
  it("imports a v1 export", () => {
    const r = parseImport(v1Blob(), NOW);
    expect(r.ok && r.state.arcs[0]!.name).toBe("Winter Arc");
  });
  it("rejects junk", () => {
    expect(parseImport("junk", NOW).ok).toBe(false);
    expect(parseImport("{}", NOW).ok).toBe(false);
  });
});
