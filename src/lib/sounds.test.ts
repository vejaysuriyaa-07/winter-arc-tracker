import { afterEach, describe, expect, it, vi } from "vitest";
import { playSound } from "./sounds";

afterEach(() => vi.unstubAllGlobals());

describe("playSound", () => {
  it("never touches audio while Sounds is off", () => {
    const AC = vi.fn();
    vi.stubGlobal("window", { AudioContext: AC });
    playSound("check", false);
    playSound("visitor", false);
    expect(AC).not.toHaveBeenCalled();
  });

  it("a refused resume (no tap yet) is swallowed, not thrown or left unhandled", async () => {
    const rejected = vi.fn();
    process.on("unhandledRejection", rejected);
    const ac = { state: "suspended", currentTime: 0, destination: {}, resume: () => Promise.reject(new Error("not allowed")),
      createOscillator: () => ({ type: "", frequency: { value: 0 }, connect: (g: unknown) => g, start: () => {}, stop: () => {} }),
      createGain: () => ({ gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: (d: unknown) => d }) };
    vi.stubGlobal("window", { AudioContext: function () { return ac; } });
    expect(() => playSound("visitor", true)).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    process.off("unhandledRejection", rejected);
    expect(rejected).not.toHaveBeenCalled();
  });
});
