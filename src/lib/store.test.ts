import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureState } from "./fixtures/arc14";
import { STORAGE_KEY, memoryAdapter, type StorageAdapter } from "./storage";

let store: typeof import("./store");

beforeEach(async () => {
  vi.resetModules();
  store = await import("./store");
});

async function withData(state = fixtureState()): Promise<StorageAdapter> {
  const a = memoryAdapter({ [STORAGE_KEY]: JSON.stringify(state) });
  await store.initStore(a);
  return a;
}

describe("store", () => {
  it("loads through the adapter and returns a stable snapshot", async () => {
    await withData();
    const a = store.getState();
    expect(a.arcs[0]!.name).toBe("Winter Arc");
    expect(store.getState()).toBe(a);
    store.update((s) => s);
    expect(store.getState()).toBe(a);
  });
  it("notifies subscribers and persists", async () => {
    const ad = await withData();
    const seen: number[] = [];
    const unsub = store.subscribe(() => seen.push(store.getState().habits.length));
    store.update((s) => ({ ...s, habits: s.habits.slice(0, 3) }));
    expect(seen).toEqual([3]);
    await store.flushWrites();
    expect(JSON.parse((await ad.get(STORAGE_KEY))!).habits).toHaveLength(3);
    unsub();
  });
  it("actions stamp now and queue sync ops", async () => {
    await withData();
    store.actions.setMood("arc-winter", "2026-10-14", "great");
    const s = store.getState();
    expect(s.logs["arc-winter:2026-10-14"]!.mood).toBe("great");
    // Loading also adds visitors the fixture already earned (queued too); the mood is one day-log op.
    expect(s.sync.queue.filter((o) => o.table === "day_logs")).toEqual([{ table: "day_logs", id: "log-2026-10-14", at: expect.any(String) }]);
  });
  it("a refused save flips the flag, the next good save clears it", async () => {
    let fail = false;
    const base = memoryAdapter({ [STORAGE_KEY]: JSON.stringify(fixtureState()) });
    const ad: StorageAdapter = {
      ...base,
      set: async (k, v) => {
        if (fail) throw new Error("quota");
        await base.set(k, v);
      },
    };
    await store.initStore(ad);
    await store.flushWrites();
    expect(store.lastSaveFailed()).toBe(false);
    fail = true;
    let notified = 0;
    store.subscribe(() => notified++);
    expect(() => store.update((s) => ({ ...s, habits: [] }))).not.toThrow();
    expect(store.getState().habits).toEqual([]);
    await store.flushWrites();
    expect(store.lastSaveFailed()).toBe(true);
    fail = false;
    store.update((s) => ({ ...s, activeArcId: null }));
    await store.flushWrites();
    expect(store.lastSaveFailed()).toBe(false);
    expect(notified).toBe(4); // two state changes, two flag flips
  });
});

describe("store safety", () => {
  it("a read error shows the banner and never overwrites what it could not read", async () => {
    const base = memoryAdapter({ [STORAGE_KEY]: JSON.stringify(fixtureState()) });
    let sets = 0;
    const ad: StorageAdapter = { ...base, get: async () => { throw new Error("blocked"); }, set: async (k, v) => { sets++; await base.set(k, v); } };
    await store.initStore(ad);
    expect(store.lastSaveFailed()).toBe(true);
    store.update((s) => ({ ...s, activeArcId: null }));
    await store.flushWrites();
    expect(sets).toBe(0);
  });
  it("writes land in order even when an older one is slower", async () => {
    const base = memoryAdapter({ [STORAGE_KEY]: JSON.stringify(fixtureState()) });
    let first = true;
    const ad: StorageAdapter = {
      ...base,
      set: async (k, v) => {
        if (first) { first = false; await new Promise((r) => setTimeout(r, 20)); }
        await base.set(k, v);
      },
    };
    await store.initStore(ad);
    store.update((s) => ({ ...s, activeArcId: null }));
    await store.flushWrites();
    expect(JSON.parse((await base.get(STORAGE_KEY))!).activeArcId).toBeNull();
  });
});

describe("import", () => {
  it("imported finished arcs never celebrate", async () => {
    await withData();
    store.actions.importState(fixtureState()); // the fixture arc ended 2026-10-18, before today
    expect(store.getState().ui.celebrated["arc:arc-winter"]).toBe(true);
  });
});
