// The only module that talks to Supabase (SPEC 10): the client, email-code
// sign in, the remote tables, and the driver that runs the sync engine when
// signed in: on sign in, on launch, when the app comes back to the front,
// when the network returns, and two seconds after a local change.
import { useSyncExternalStore } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { SyncTable } from "../types";
import { todayLocal } from "./dates";
import { authStorage, backupBeforeSwitch, readSyncUser, serialize, writeSyncUser } from "./storage";
import * as store from "./store";
import { afterSignIn, guardIO, pullAll, syncOnce, type PageCursor, type Remote, type Row } from "./sync-engine";

// ---------- configuration ----------

type Env = { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string };

export function hasSupabase(env: Env = import.meta.env as Env): boolean {
  return Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
}

let client: SupabaseClient | null = null;

function sb(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  const env = import.meta.env as Env;
  client ??= createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!, {
    auth: {
      storage: authStorage(store.storageAdapter()),
      storageKey: "grove-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

// ---------- messages ----------

type AuthErrorLike = { status?: number | undefined; code?: string | undefined; message?: string | undefined };

const isNetwork = (message: string | undefined): boolean => /failed to fetch|networkerror|load failed|network request failed/i.test(message ?? "");

/** Plain words for a failed send or verify. The email rate limit gets the friendly line. */
export function codeErrorMessage(err: AuthErrorLike, stage: "send" | "verify", online: boolean): string {
  if (!online || isNetwork(err.message)) return "You're offline. Connect and try again.";
  if (err.status === 429 || err.code === "over_email_send_rate_limit" || /rate limit|only request this after/i.test(err.message ?? "")) {
    return "Too many codes sent. Try again in a bit.";
  }
  if (stage === "verify" && (err.code === "otp_expired" || err.status === 403 || err.status === 400 || /expired|invalid/i.test(err.message ?? ""))) {
    return "That code did not work. Check it or send a new one.";
  }
  return stage === "send" ? "Could not send a code. Try again." : "Could not sign in. Try again.";
}

export type SyncPhase = "idle" | "syncing" | "synced" | "offline" | "failed";

export function failureKind(err: unknown, online: boolean): "offline" | "failed" {
  if (!online) return "offline";
  const message = err instanceof Error ? err.message : String((err as AuthErrorLike | null)?.message ?? err);
  return isNetwork(message) ? "offline" : "failed";
}

/** The status line in Settings, in the spec's words. */
export function statusText(v: { phase: SyncPhase; lastSyncedAt: number | null }, now: number): string {
  switch (v.phase) {
    case "offline": return "Offline, will sync later";
    case "failed": return "Sync failed, tap to retry";
    case "synced": {
      const min = Math.floor((now - (v.lastSyncedAt ?? now)) / 60_000);
      return min < 1 ? "Synced just now" : min < 60 ? `Synced ${min} min ago` : "Synced over an hour ago";
    }
    default: return "Syncing";
  }
}

// ---------- remote tables ----------

const PAGE = 1000;

function supabaseRemote(c: SupabaseClient): Remote {
  return {
    async push(table: SyncTable, rows: Row[]) {
      const { error } = await c.from(table).upsert(rows, { onConflict: "user_id,id" });
      if (error) throw new Error(error.message);
    },
    async pull(table: SyncTable, since: string | undefined) {
      return pullAll(async (after: PageCursor) => {
        let q = c.from(table).select("*").order("synced_at", { ascending: true }).order("id", { ascending: true }).limit(PAGE);
        if (since !== undefined) q = q.gt("synced_at", since);
        if (after) q = q.or(`synced_at.gt."${after.syncedAt}",and(synced_at.eq."${after.syncedAt}",id.gt.${after.id})`);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return (data ?? []) as Row[];
      }, PAGE);
    },
  };
}

// ---------- status store ----------

/** `ready` turns true once the saved session has been read, so nothing flashes as signed out on launch. */
export type SyncView = { configured: boolean; ready: boolean; email: string | null; phase: SyncPhase; lastSyncedAt: number | null };

let view: SyncView = { configured: hasSupabase(), ready: !hasSupabase(), email: null, phase: "idle", lastSyncedAt: null };
const listeners = new Set<() => void>();

function setView(patch: Partial<SyncView>): void {
  view = { ...view, ...patch };
  for (const l of listeners) l();
}

export function useSync(): SyncView {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => view,
  );
}

// ---------- driver ----------

let session: Session | null = null;
/** Bumped on every sign in and sign out; a run started under an older value applies nothing. */
let epoch = 0;
let current: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

const online = (): boolean => (typeof navigator === "undefined" ? true : navigator.onLine !== false);

function schedule(ms: number): void {
  if (!session) return;
  clearTimeout(timer);
  timer = setTimeout(() => void run(), ms);
}

function run(): Promise<void> {
  if (current) {
    again = true;
    return current;
  }
  current = runOnce().finally(() => {
    current = null;
    if (again) {
      again = false;
      schedule(0);
    }
  });
  return current;
}

async function runOnce(): Promise<void> {
  const c = sb();
  if (!c || !session) return;
  if (store.isReadOnly()) {
    // Storage could not be read; syncing over it could lose data.
    setView({ phase: "failed" });
    return;
  }
  if (!online()) {
    setView({ phase: "offline" });
    return;
  }
  const mine = epoch;
  const isCurrent = (): boolean => mine === epoch;
  setView({ phase: "syncing" });
  try {
    await syncOnce(guardIO({
      getState: store.getState,
      apply: store.update,
      remote: supabaseRemote(c),
      userId: session.user.id,
      now: () => new Date().toISOString(),
      today: () => todayLocal(),
    }, isCurrent));
    if (isCurrent()) setView({ phase: "synced", lastSyncedAt: Date.now() });
  } catch (err) {
    if (isCurrent()) setView({ phase: failureKind(err, online()) });
  }
}

/** Waits out a run in flight after making sure it can no longer change anything. */
async function endCurrentRun(): Promise<void> {
  epoch++;
  clearTimeout(timer);
  again = false;
  await current?.catch(() => undefined);
}

/** Retry now (the status row's tap). */
export function syncNow(): void {
  schedule(0);
}

function adopt(s: Session | null): void {
  session = s;
  setView({ ready: true, email: s?.user.email ?? null, phase: s ? view.phase : "idle", ...(s ? {} : { lastSyncedAt: null }) });
}

let started = false;

/** Starts the driver once, after the store is loaded. Does nothing without keys. */
export function startSync(): void {
  const c = sb();
  if (!c || started) return;
  started = true;
  c.auth.onAuthStateChange((_event, s) => {
    adopt(s);
    // Never call the auth client from inside this callback; run on the next tick.
    if (s) schedule(0);
  });
  window.addEventListener("online", () => schedule(0));
  window.addEventListener("offline", () => session && setView({ phase: "offline" }));
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && schedule(0));
  store.subscribe(() => {
    if (session && store.getState().sync.queue.length > 0) schedule(2000);
  });
}

// ---------- sign in ----------

export type CodeResult = { ok: true } | { ok: false; message: string };

export async function sendCode(email: string): Promise<CodeResult> {
  const c = sb();
  if (!c) return { ok: false, message: "Sync is not set up in this build." };
  try {
    const { error } = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return error ? { ok: false, message: codeErrorMessage(error, "send", online()) } : { ok: true };
  } catch (err) {
    return { ok: false, message: codeErrorMessage(err as AuthErrorLike, "send", online()) };
  }
}

/**
 * Checks the 6-digit code. The first account on this device (or the same one
 * again) takes in the local data; a different account starts from an empty
 * device, with the old data kept in a backup first.
 */
export async function verifyCode(email: string, code: string): Promise<CodeResult> {
  const c = sb();
  if (!c) return { ok: false, message: "Sync is not set up in this build." };
  try {
    const { data, error } = await c.auth.verifyOtp({ email, token: code, type: "email" });
    if (error || !data.session) return { ok: false, message: codeErrorMessage(error ?? {}, "verify", online()) };
    await endCurrentRun();
    const a = store.storageAdapter();
    const userId = data.session.user.id;
    const before = store.getState();
    const next = afterSignIn(before, await readSyncUser(a), userId, new Date().toISOString());
    if (next.backup) await backupBeforeSwitch(a, serialize(before), new Date().toISOString());
    store.replaceState(next.state);
    await writeSyncUser(a, userId);
    adopt(data.session);
    schedule(0);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: codeErrorMessage(err as AuthErrorLike, "verify", online()) };
  }
}

/** Signs out on this device only. Local data stays. */
export async function signOut(): Promise<void> {
  const c = sb();
  if (!c) return;
  await endCurrentRun();
  await c.auth.signOut({ scope: "local" });
  adopt(null);
}
