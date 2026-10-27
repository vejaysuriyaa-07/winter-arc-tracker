import { describe, expect, it } from "vitest";
import { codeErrorMessage, failureKind, hasSupabase, statusText } from "./sync";

describe("configuration", () => {
  it("sync is on only when both keys are present", () => {
    expect(hasSupabase({ VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_ANON_KEY: "k" })).toBe(true);
    expect(hasSupabase({ VITE_SUPABASE_URL: "https://x.supabase.co" })).toBe(false);
    expect(hasSupabase({})).toBe(false);
  });
});

describe("sign-in messages", () => {
  it("the email rate limit gets the friendly line", () => {
    expect(codeErrorMessage({ status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" }, "send", true)).toBe("Too many codes sent. Try again in a bit.");
    expect(codeErrorMessage({ status: 429, message: "For security purposes, you can only request this after 37 seconds." }, "send", true)).toBe("Too many codes sent. Try again in a bit.");
  });
  it("a wrong or expired code says so", () => {
    expect(codeErrorMessage({ status: 403, code: "otp_expired", message: "Token has expired or is invalid" }, "verify", true)).toBe("That code did not work. Check it or send a new one.");
  });
  it("offline is named as offline", () => {
    expect(codeErrorMessage({ message: "Failed to fetch" }, "send", false)).toBe("You're offline. Connect and try again.");
  });
  it("anything else is a plain retry line", () => {
    expect(codeErrorMessage({ status: 500, message: "boom" }, "send", true)).toBe("Could not send a code. Try again.");
    expect(codeErrorMessage({ status: 500, message: "boom" }, "verify", true)).toBe("Could not sign in. Try again.");
  });
});

describe("sync status", () => {
  it("network failures count as offline, others as failed", () => {
    expect(failureKind(new TypeError("Failed to fetch"), true)).toBe("offline");
    expect(failureKind(new Error("anything"), false)).toBe("offline");
    expect(failureKind(new Error("permission denied"), true)).toBe("failed");
  });
  it("uses the spec's wording", () => {
    const now = Date.parse("2026-10-14T12:00:00Z");
    expect(statusText({ phase: "synced", lastSyncedAt: now - 20_000 }, now)).toBe("Synced just now");
    expect(statusText({ phase: "synced", lastSyncedAt: now - 5 * 60_000 }, now)).toBe("Synced 5 min ago");
    expect(statusText({ phase: "syncing", lastSyncedAt: null }, now)).toBe("Syncing");
    expect(statusText({ phase: "offline", lastSyncedAt: null }, now)).toBe("Offline, will sync later");
    expect(statusText({ phase: "failed", lastSyncedAt: null }, now)).toBe("Sync failed, tap to retry");
    expect(statusText({ phase: "idle", lastSyncedAt: null }, now)).toBe("Syncing");
  });
});
