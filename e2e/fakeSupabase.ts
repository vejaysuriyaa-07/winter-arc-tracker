// A stand-in for the Supabase auth and REST endpoints, answered inside the
// browser test. Same server rules as supabase/migrations/0001_grove.sql: rows
// keyed by (user_id, id), a stale write never replaces a newer row, synced_at
// is server time.
import type { Page, Route } from "@playwright/test";
import { rowError } from "../src/lib/fixtures/fakeRemote";
import type { SyncTable } from "../src/types";

export const FAKE_URL = "http://supabase.test";
export const USER_ID = "5e1f0000-0000-4000-8000-00000000c0de";
export const EMAIL = "gardener@example.com";
export const GOOD_CODE = "123456";

type Row = Record<string, unknown>;

export class FakeSupabase {
  tables = new Map<string, Map<string, Row>>();
  otp: "ok" | "rate-limit" = "ok";
  failRest = false;
  otpSends = 0;
  private clock = Date.parse("2026-10-26T00:00:00Z");

  constructor(private pageNow: number) {}

  rows(table: string): Row[] {
    return [...(this.tables.get(table)?.values() ?? [])];
  }

  /** A row written by another device. */
  write(table: string, row: Row): void {
    let t = this.tables.get(table);
    if (!t) this.tables.set(table, (t = new Map()));
    const key = `${String(row.user_id)}:${String(row.id)}`;
    const old = t.get(key);
    this.clock += 1000;
    if (old && Date.parse(String(old.updated_at)) > Date.parse(String(row.updated_at))) {
      t.set(key, { ...old, synced_at: new Date(this.clock).toISOString().replace("Z", "+00:00") });
      return;
    }
    t.set(key, { ...row, synced_at: new Date(this.clock).toISOString().replace("Z", "+00:00") });
  }

  private session(): Row {
    const exp = Math.floor(this.pageNow / 1000) + 3600;
    const b64 = (o: object): string => Buffer.from(JSON.stringify(o)).toString("base64url");
    const access = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER_ID, email: EMAIL, role: "authenticated", aud: "authenticated", exp })}.sig`;
    return {
      access_token: access,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: exp,
      refresh_token: "fake-refresh",
      user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: EMAIL, app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" },
    };
  }

  async install(page: Page): Promise<void> {
    await page.route(`${FAKE_URL}/**`, (route) => this.handle(route));
  }

  private json(route: Route, status: number, body: unknown): Promise<void> {
    return route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  }

  private async handle(route: Route): Promise<void> {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    }
    const path = url.pathname;
    if (path === "/auth/v1/otp") {
      this.otpSends++;
      if (this.otp === "rate-limit") return this.json(route, 429, { code: 429, error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" });
      return this.json(route, 200, {});
    }
    if (path === "/auth/v1/verify") {
      const body = req.postDataJSON() as { token?: string };
      if (body.token !== GOOD_CODE) return this.json(route, 403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
      return this.json(route, 200, this.session());
    }
    if (path === "/auth/v1/logout") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    if (path === "/auth/v1/user") return this.json(route, 200, (this.session() as { user: Row }).user);
    if (path.startsWith("/rest/v1/")) {
      if (this.failRest) return this.json(route, 500, { message: "server error" });
      const table = path.slice("/rest/v1/".length);
      if (req.method() === "POST") {
        const rows = req.postDataJSON() as Row[];
        const list = Array.isArray(rows) ? rows : [rows];
        for (const r of list) {
          if (r.user_id !== USER_ID) return this.json(route, 403, { message: "new row violates row-level security policy" });
          const bad = rowError(table as SyncTable, r);
          if (bad) return this.json(route, 400, { message: bad });
        }
        for (const r of list) this.write(table, r);
        return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" }, body: "" });
      }
      if (req.method() === "GET") {
        const gt = url.searchParams.get("synced_at")?.replace(/^gt\./, "");
        const since = gt ? Date.parse(gt) : Number.NEGATIVE_INFINITY;
        const out = this.rows(table)
          .filter((r) => r.user_id === USER_ID && Date.parse(String(r.synced_at)) > since)
          .sort((a, b) => Date.parse(String(a.synced_at)) - Date.parse(String(b.synced_at)));
        return this.json(route, 200, out);
      }
    }
    return this.json(route, 404, { message: `no fake for ${req.method()} ${path}` });
  }
}
