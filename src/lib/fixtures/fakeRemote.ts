// In-memory stand-in for the Supabase tables, with the same server rules as
// supabase/migrations/0001_grove.sql: rows keyed by (user_id, id), a stale
// write never replaces a newer row, and synced_at is the server's clock.
import type { SyncTable } from "../../types";
import type { Remote, Row } from "../sync-engine";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const int = (v: unknown, lo: number, hi: number): boolean => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** The column types and checks of the SQL tables; a batch with one bad row fails whole, like Postgres. */
export function rowError(t: SyncTable, r: Row): string | null {
  if (!UUID.test(String(r.id)) || !UUID.test(String(r.user_id))) return "invalid input syntax for type uuid";
  if ("arc_id" in r && !UUID.test(String(r.arc_id))) return "invalid input syntax for type uuid";
  if (t === "arcs") {
    if (!int(r.length_days, 1, 3650) || !int(r.threshold, 0, 100)) return "violates check constraint";
    if (!["winter", "spring", "summer", "autumn"].includes(String(r.season)) || !["journal", "greenhouse", "night"].includes(String(r.look))) return "violates check constraint";
  }
  if (t === "habits" && !int(r.sort_order, -2147483648, 2147483647)) return "invalid input syntax for type integer";
  if (t === "day_logs" && r.mood !== null && !["great", "good", "okay", "low", "rough"].includes(String(r.mood))) return "violates check constraint";
  if (t === "settings" && r.id !== r.user_id) return "violates check constraint";
  return null;
}

export class FakeRemote {
  tables = new Map<SyncTable, Map<string, Row>>();
  offline = false;
  failNext = false;
  pushes = 0;
  pulled: Row[] = [];
  private clock = Date.parse("2026-10-14T00:00:00Z");

  /** Server time moves 5 minutes per write, more than the pull overlap. */
  private tick(): string {
    this.clock += 5 * 60_000;
    return new Date(this.clock).toISOString().replace(".000Z", "+00:00");
  }

  private table(t: SyncTable): Map<string, Row> {
    let m = this.tables.get(t);
    if (!m) this.tables.set(t, (m = new Map()));
    return m;
  }

  rows(t: SyncTable, userId?: string): Row[] {
    return [...this.table(t).values()].filter((r) => userId === undefined || r.user_id === userId);
  }

  /** Writes a row the way another device would, through the same server rules. */
  write(t: SyncTable, row: Row): void {
    const key = `${String(row.user_id)}:${String(row.id)}`;
    const old = this.table(t).get(key);
    // A stale write keeps the newer row but marks it changed, so the writer pulls the winner back.
    if (old && Date.parse(String(old.updated_at)) > Date.parse(String(row.updated_at))) {
      this.table(t).set(key, { ...old, synced_at: this.tick() });
      return;
    }
    this.table(t).set(key, { ...row, synced_at: this.tick() });
  }

  as(userId: string): Remote {
    const guard = (): void => {
      if (this.offline) throw new TypeError("Failed to fetch");
      if (this.failNext) {
        this.failNext = false;
        throw new Error("500 from server");
      }
    };
    return {
      push: async (t, rows) => {
        guard();
        this.pushes++;
        for (const r of rows) {
          if (r.user_id !== userId) throw new Error("row level security");
          const bad = rowError(t, r);
          if (bad) throw new Error(bad);
        }
        for (const r of rows) this.write(t, r);
      },
      pull: async (t, since) => {
        guard();
        const out = this.rows(t, userId).filter((r) => since === undefined || Date.parse(String(r.synced_at)) > Date.parse(since));
        this.pulled.push(...out);
        return out.map((r) => ({ ...r }));
      },
    };
  }
}
