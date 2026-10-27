import { describe, expect, it } from "vitest";
import { FIX_TODAY, fixtureState } from "./fixtures/arc14";
import { shouldPromptSignIn } from "./prompts";

describe("sign-in prompt (SPEC 5.11)", () => {
  it("shows once there is a full day, while signed out, with sync set up", () => {
    expect(shouldPromptSignIn(fixtureState(), FIX_TODAY, { configured: true, signedIn: false })).toBe(true);
  });
  it("never before the first full day", () => {
    expect(shouldPromptSignIn({ ...fixtureState(), logs: {} }, FIX_TODAY, { configured: true, signedIn: false })).toBe(false);
    expect(shouldPromptSignIn(fixtureState(), "2026-10-04", { configured: true, signedIn: false })).toBe(false); // before the arc starts
  });
  it("never again once answered, when signed in, or without sync", () => {
    const s = fixtureState();
    expect(shouldPromptSignIn({ ...s, ui: { ...s.ui, signInPrompted: true } }, FIX_TODAY, { configured: true, signedIn: false })).toBe(false);
    expect(shouldPromptSignIn(s, FIX_TODAY, { configured: true, signedIn: true })).toBe(false);
    expect(shouldPromptSignIn(s, FIX_TODAY, { configured: false, signedIn: false })).toBe(false);
  });
});
