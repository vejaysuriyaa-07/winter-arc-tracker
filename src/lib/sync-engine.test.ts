import { describe, expect, it } from "vitest";
import type { AppState } from "../types";
import { A, ARC, FIX_TODAY, fixtureState } from "./fixtures/arc14";
import { stableId } from "./ids";
import { FakeRemote } from "./fixtures/fakeRemote";
import * as m from "./mutations";
import { PULL_OVERLAP_MS, afterSignIn, fromRow, guardIO, prepareImport, pullAll, queueAll, serverTime, syncOnce, type Row, type SyncIO } from "./sync-engine";
import { SYNC_TABLES } from "../types";
import { metVisitors } from "./visitors";


/** The hand-worked fixture with every id turned into a uuid, as real data has. */
const idOf = (id: string): string => stableId(`fx:${id}`);
const ARCU = idOf(ARC);
const AU = idOf(A);
const CU = idOf("h-charlie");
function fx(): AppState {
  const s = fixtureState();
  return {
    ...s,
    activeArcId: s.activeArcId === null ? null : idOf(s.activeArcId),
    arcs: s.arcs.map((a) => ({ ...a, id: idOf(a.id) })),
    habits: s.habits.map((h) => ({ ...h, id: idOf(h.id), arcId: idOf(h.arcId) })),
    logs: Object.fromEntries(Object.values(s.logs).map((l) => {
      const log = { ...l, id: idOf(l.id), arcId: idOf(l.arcId), completedHabitIds: l.completedHabitIds.map(idOf) };
      return [`${log.arcId}:${log.date}`, log];
    })),
    visitors: s.visitors.map((v) => ({ ...v, id: idOf(v.id), arcId: idOf(v.arcId) })),
    ui: { ...s.ui, celebrated: {} },
  };
}

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

/** One device: its own state and clock, talking to the shared fake server. */
class Device {
  state: AppState;
  clock = Date.parse("2026-10-14T12:00:00Z");
  constructor(public remote: FakeRemote, start: AppState, public userId = USER) {
    this.state = start;
  }
  now = (): string => new Date((this.clock += 1000)).toISOString();
  io(): SyncIO {
    return {
      getState: () => this.state,
      apply: (fn) => {
        this.state = fn(this.state);
      },
      remote: this.remote.as(this.userId),
      userId: this.userId,
      now: this.now,
      today: () => FIX_TODAY,
    };
  }
  sync = (): Promise<void> => syncOnce(this.io());
  act(fn: (s: AppState, now: string) => AppState): void {
    this.state = fn(this.state, this.now());
  }
}

const SYNC_TABLES_ROWS = (server: FakeRemote): number => SYNC_TABLES.reduce((n, t) => n + server.rows(t).length, 0);

function emptyState(): AppState {
  const s = fx();
  return { ...s, arcs: [], habits: [], logs: {}, visitors: [], activeArcId: null, ui: { ...s.ui, celebrated: {}, recapSeen: [] }, sync: { queue: [] } };
}

describe("push", () => {
  it("first sign in uploads every local row, snake_case, owned by the user, and empties the queue", async () => {
    const server = new FakeRemote();
    const d = new Device(server, queueAll(fx()));
    await d.sync();
    expect(d.state.sync.queue).toEqual([]);
    const arcs = server.rows("arcs", USER);
    expect(arcs).toHaveLength(1);
    expect(arcs[0]).toMatchObject({ id: ARCU, user_id: USER, start_date: "2026-10-05", length_days: 14, threshold: 80, deleted: false });
    expect(server.rows("habits", USER).length).toBe(fx().habits.length);
    expect(server.rows("day_logs", USER).length).toBe(Object.keys(fx().logs).length);
    expect(server.rows("settings", USER)).toEqual([expect.objectContaining({ id: USER, user_id: USER })]);
  });

  it("offline keeps the queue and the data; the next sync sends it", async () => {
    const server = new FakeRemote();
    const d = new Device(server, fx());
    d.act((s, n) => m.toggleHabit(s, n, ARCU, FIX_TODAY, CU));
    server.offline = true;
    await expect(d.sync()).rejects.toThrow();
    expect(d.state.sync.queue.length).toBeGreaterThan(0);
    server.offline = false;
    await d.sync();
    expect(d.state.sync.queue).toEqual([]);
    const log = server.rows("day_logs", USER).find((r) => r.date === FIX_TODAY)!;
    expect(log.completed_habit_ids).toContain(CU);
  });

  it("a change made while a push is in flight stays queued", async () => {
    const server = new FakeRemote();
    const d = new Device(server, fx());
    d.act((s, n) => m.editHabit(s, n, AU, { name: "Alpha one" }));
    const io = d.io();
    const push = io.remote.push;
    let edited = false;
    io.remote = { ...io.remote, push: async (t, rows) => {
      await push(t, rows);
      if (t === "habits" && !edited) {
        edited = true;
        d.act((s, n) => m.editHabit(s, n, AU, { name: "Alpha two" }));
      }
    } };
    await syncOnce(io);
    // the second edit was not dropped with the first: the round's last push sent it
    expect(server.rows("habits", USER).find((r) => r.id === AU)!.name).toBe("Alpha two");
    expect(d.state.sync.queue).toEqual([]);
  });

  it("the server keeps a newer row when an older one arrives late", async () => {
    const server = new FakeRemote();
    const a = new Device(server, fx());
    const b = new Device(server, fx());
    b.clock += 60_000; // B edits later
    a.act((s, n) => m.editHabit(s, n, AU, { name: "From A" }));
    b.act((s, n) => m.editHabit(s, n, AU, { name: "From B" }));
    await b.sync();
    await a.sync(); // A's older edit arrives after B's
    expect(server.rows("habits", USER).find((r) => r.id === AU)!.name).toBe("From B");
    expect(a.state.habits.find((h) => h.id === AU)!.name).toBe("From B"); // and A takes it on pull
  });
});

describe("pull", () => {
  it("a second device gets everything, with the active arc picked and nothing celebrated live", async () => {
    const server = new FakeRemote();
    const a = new Device(server, queueAll(fx()));
    await a.sync();
    const b = new Device(server, emptyState());
    await b.sync();
    expect(b.state.arcs.map((x) => x.id)).toEqual([ARCU]);
    expect(b.state.activeArcId).toBe(ARCU);
    expect(b.state.habits.length).toBe(a.state.habits.length);
    expect(b.state.logs).toEqual(a.state.logs);
    expect(b.state.settings).toEqual(a.state.settings);
    // every visitor already earned is in place, so the live watcher has nothing to announce
    const arc = b.state.arcs[0]!;
    expect(metVisitors(b.state, arc, FIX_TODAY, new Set(b.state.visitors.filter((v) => v.arcId === ARCU).map((v) => v.visitorId)))).toEqual([]);
    expect(b.state.sync.queue.every((op) => op.table === "visitors_found")).toBe(true);
  });

  it("newest updatedAt wins per row; an equal or older remote row never replaces local", async () => {
    const server = new FakeRemote();
    const a = new Device(server, queueAll(fx()));
    await a.sync();
    const b = new Device(server, emptyState());
    await b.sync();
    b.act((s, n) => m.updateArc(s, n, ARCU, { name: "B's name" }));
    a.clock = b.clock + 60_000;
    a.act((s, n) => m.updateArc(s, n, ARCU, { threshold: 70 }));
    await b.sync();
    await a.sync();
    await b.sync();
    // A's change is newer and carries the whole row: threshold 70 and A's (old) name
    expect(b.state.arcs[0]).toMatchObject({ name: "Winter Arc", threshold: 70 });
    expect(a.state.arcs[0]).toMatchObject({ name: "Winter Arc", threshold: 70 });
  });

  it("the same day checked on two devices ends as one log, newest wins", async () => {
    const server = new FakeRemote();
    const a = new Device(server, queueAll(fx()));
    await a.sync();
    const b = new Device(server, emptyState());
    await b.sync();
    a.act((s, n) => m.toggleHabit(s, n, ARCU, "2026-10-15", AU));
    b.clock = a.clock + 60_000;
    b.act((s, n) => m.toggleHabit(s, n, ARCU, "2026-10-15", CU));
    await a.sync();
    await b.sync();
    await a.sync();
    expect(server.rows("day_logs", USER).filter((r) => r.date === "2026-10-15")).toHaveLength(1);
    expect(a.state.logs[`${ARCU}:2026-10-15`]!.completedHabitIds).toEqual([CU]);
  });

  it("a deleted arc travels as a tombstone", async () => {
    const server = new FakeRemote();
    const a = new Device(server, queueAll(fx()));
    await a.sync();
    const b = new Device(server, emptyState());
    await b.sync();
    a.act((s, n) => m.deleteArc(s, n, ARCU));
    await a.sync();
    await b.sync();
    expect(b.state.arcs[0]!.deleted).toBe(true);
    expect(b.state.activeArcId).toBeNull();
  });

  it("each pull asks only for rows changed since the last one, plus a one-minute overlap", async () => {
    const server = new FakeRemote();
    const a = new Device(server, queueAll(fx()));
    await a.sync();
    await a.sync();
    const last = Date.parse(a.state.sync.lastPulledAt!);
    server.pulled = [];
    await a.sync();
    const total = SYNC_TABLES_ROWS(server);
    expect(server.pulled.length).toBeLessThan(total);
    for (const r of server.pulled) expect(Date.parse(String(r.synced_at))).toBeGreaterThan(last - PULL_OVERLAP_MS);
  });

  it("another user's rows never arrive", async () => {
    const server = new FakeRemote();
    await new Device(server, queueAll(fx()), OTHER).sync();
    const mine = new Device(server, emptyState());
    await mine.sync();
    expect(mine.state.arcs).toEqual([]);
  });

  it("a finished arc that arrives by sync never celebrates", async () => {
    const server = new FakeRemote();
    const old = fx();
    old.arcs[0] = { ...old.arcs[0]!, startDate: "2026-09-01" }; // ended 2026-09-14
    await new Device(server, queueAll(old)).sync();
    const b = new Device(server, emptyState());
    await b.sync();
    expect(b.state.ui.celebrated[`arc:${ARCU}`]).toBe(true);
  });
});

describe("import", () => {
  it("restamps the file, tombstones what it drops, queues everything and keeps this device's sync state", () => {
    const local = { ...fx(), sync: { lastPulledAt: "2026-10-14T00:00:00.000Z", queue: [] } };
    const extra = m.createArc(local, "2026-10-14T01:00:00.000Z", { name: "Other", season: "spring", look: "journal", startDate: "2026-10-14", lengthDays: 30, habits: [{ name: "Walk" }] });
    const file = { ...fx(), sync: { lastPulledAt: "2020-01-01T00:00:00.000Z", queue: [{ table: "arcs" as const, id: "zzz", at: "2020-01-01T00:00:00.000Z" }] } };
    const out = prepareImport(extra, file, "2026-10-14T13:00:00.000Z");
    expect(out.sync.lastPulledAt).toBe("2026-10-14T00:00:00.000Z");
    expect(out.arcs.every((x) => x.updatedAt === "2026-10-14T13:00:00.000Z")).toBe(true);
    const dropped = out.arcs.find((x) => x.name === "Other")!;
    expect(dropped.deleted).toBe(true);
    expect(out.habits.find((h) => h.name === "Walk")!.deleted).toBe(true);
    expect(out.activeArcId).toBe(file.activeArcId);
    expect(out.sync.queue.some((op) => op.id === "zzz")).toBe(false);
    expect(out.sync.queue.some((op) => op.table === "arcs" && op.id === dropped.id)).toBe(true);
    expect(out.sync.queue.filter((op) => op.table === "day_logs").length).toBe(Object.keys(file.logs).length);
  });
});

describe("server timestamps", () => {
  it("microsecond times from Postgres read the same on every browser", () => {
    const row = { id: ARCU, user_id: USER, name: "x", season: "winter", look: "journal", start_date: "2026-10-01", length_days: 90, threshold: 80, created_at: "2026-10-14T12:00:00.123456+00:00", frozen_at: null, updated_at: "2026-10-14T12:00:00.987654+00:00", deleted: false };
    expect(fromRow("arcs", row)).toMatchObject({ createdAt: "2026-10-14T12:00:00.123Z", updatedAt: "2026-10-14T12:00:00.987Z" });
    expect(serverTime("2026-10-14T12:00:00.987654+00:00")).toBe(Date.UTC(2026, 9, 14, 12, 0, 0, 987));
  });
});

describe("review fixes", () => {
  it("a row the server would refuse is kept on this device but never blocks the rest", async () => {
    const server = new FakeRemote();
    const st = fx();
    st.arcs.push({ ...st.arcs[0]!, id: "arc-1", name: "Old export" });
    st.arcs.push({ ...st.arcs[0]!, id: idOf("long"), name: "Too long", lengthDays: 5000 });
    const d = new Device(server, queueAll(st));
    await d.sync();
    expect(server.rows("arcs", USER).map((r) => r.name)).toEqual(["Winter Arc"]);
    expect(server.rows("habits", USER).length).toBe(st.habits.length);
    expect(d.state.sync.queue).toEqual([]);
    expect(d.state.arcs.map((a) => a.name)).toContain("Old export");
  });

  it("a device whose clock runs behind gets the winning row back after its stale write", async () => {
    const server = new FakeRemote();
    const a = new Device(server, queueAll(fx()));
    await a.sync();
    const b = new Device(server, emptyState());
    await b.sync();
    b.clock += 3_600_000; // B's clock is an hour ahead
    b.act((s, n) => m.editHabit(s, n, AU, { name: "From B" }));
    await b.sync();
    await a.sync(); // A now has B's row
    a.act((s, n) => m.editHabit(s, n, AU, { name: "From A, behind" })); // stamped earlier than B's
    await a.sync();
    expect(server.rows("habits", USER).find((r) => r.id === AU)!.name).toBe("From B");
    expect(a.state.habits.find((h) => h.id === AU)!.name).toBe("From B");
  });

  it("an arc that becomes finished through a pull never fires the live finish", async () => {
    const server = new FakeRemote();
    const a = new Device(server, queueAll(fx()));
    await a.sync();
    const b = new Device(server, emptyState());
    await b.sync();
    expect(b.state.ui.celebrated[`arc:${ARCU}`]).toBeUndefined(); // still running on FIX_TODAY
    a.act((s, n) => m.updateArc(s, n, ARCU, { lengthDays: 5 })); // ended 2026-10-09
    await a.sync();
    await b.sync();
    expect(b.state.ui.celebrated[`arc:${ARCU}`]).toBe(true);
  });

  it("pulls every page, even when a page boundary falls inside one write", async () => {
    const rows: Row[] = Array.from({ length: 7 }, (_, i) => ({ id: `r${i}`, synced_at: i < 5 ? "2026-10-14T12:00:00.000001+00:00" : `2026-10-14T12:00:0${i}+00:00` }));
    const sorted = [...rows].sort((x, y) => (String(x.synced_at) === String(y.synced_at) ? String(x.id).localeCompare(String(y.id)) : serverTime(x.synced_at) - serverTime(y.synced_at)));
    const fetchPage = async (after: { syncedAt: string; id: string } | null): Promise<Row[]> => {
      const start = after === null ? 0 : sorted.findIndex((r) => r.synced_at === after.syncedAt && r.id === after.id) + 1;
      return sorted.slice(start, start + 3);
    };
    const all = await pullAll(fetchPage, 3);
    expect(all.map((r) => r.id).sort()).toEqual(rows.map((r) => r.id).sort());
  });

  it("an import empties day logs that the file does not have", () => {
    const local = fx();
    const file = fx();
    const dropped = Object.keys(file.logs)[0]!;
    delete file.logs[dropped];
    const out = prepareImport(local, file, "2026-10-14T13:00:00.000Z");
    expect(out.logs[dropped]).toMatchObject({ completedHabitIds: [], updatedAt: "2026-10-14T13:00:00.000Z" });
    expect(out.logs[dropped]!.mood).toBeUndefined();
  });

  it("a run that outlives its account changes nothing", async () => {
    const server = new FakeRemote();
    await new Device(server, queueAll(fx())).sync();
    const d = new Device(server, emptyState());
    let current = true;
    const io = guardIO(d.io(), () => current);
    const pull = io.remote.pull;
    io.remote = { ...io.remote, pull: async (t, since) => {
      current = false; // signed out while the pull was on the wire
      return pull(t, since);
    } };
    await expect(syncOnce(io)).rejects.toThrow("stale");
    expect(d.state.arcs).toEqual([]);
    expect(d.state.sync.lastPulledAt).toBeUndefined();
  });
});

describe("signing in", () => {
  it("the first account on this device takes in the local data", () => {
    const r = afterSignIn(fx(), null, USER, "2026-10-14T13:00:00.000Z");
    expect(r.backup).toBe(false);
    expect(r.state.arcs.map((a) => a.id)).toEqual([ARCU]);
    expect(r.state.sync.queue.some((op) => op.table === "arcs" && op.id === ARCU)).toBe(true);
    expect(r.state.sync.lastPulledAt).toBeUndefined();
    expect(r.state.ui.signInPrompted).toBe(true);
  });

  it("the same account again merges as before", () => {
    expect(afterSignIn(fx(), USER, USER, "2026-10-14T13:00:00.000Z").state.arcs).toHaveLength(1);
  });

  it("a different account starts from an empty device, after a backup of the old data", () => {
    const r = afterSignIn(fx(), OTHER, USER, "2026-10-14T13:00:00.000Z");
    expect(r.backup).toBe(true);
    expect(r.state.arcs).toEqual([]);
    expect(r.state.habits).toEqual([]);
    expect(r.state.logs).toEqual({});
    expect(r.state.sync.queue).toEqual([]); // nothing local may overwrite the account, settings included
    expect(r.state.settings.updatedAt).toBe(new Date(0).toISOString());
  });
});
