import { describe, expect, it } from "vitest";
import { LOOKS, SEASONS } from "../types";
import { LOOK_TOKENS, mix, rgba, themeFor } from "./tokens";

// SPEC-v2 section 4.1, copied by hand so a typo in tokens.ts fails here.
const SPEC = {
  journal: {
    bg: ["#F8F4EB", "#EFE8DB"], text: "#272520", muted: "#6B6555", line: "#DCD3C2",
    accent: { winter: "#3E5F75", spring: "#9E4C66", summer: "#7D5A0C", autumn: "#9C4A26" },
    tint: { winter: "#D3E3EE", spring: "#F2D6DE", summer: "#F3E2B8", autumn: "#F1D4C0" },
    radius: 20,
  },
  greenhouse: {
    bg: ["#ECEFE6", "#DDE2D3"], text: "#1D2820", muted: "#5B675C", line: "#CBD2C2",
    accent: { winter: "#355A6E", spring: "#8E4560", summer: "#76600F", autumn: "#8E4423" },
    tint: { winter: "#C9DCE4", spring: "#E8D0DA", summer: "#E7DFB8", autumn: "#E8CDBE" },
    radius: 26,
  },
  night: {
    bg: ["#151913", "#0D100B"], text: "#EDE6D5", muted: "#A39D8C", line: "#2A3026",
    accent: { winter: "#A9C6D6", spring: "#E4A7B6", summer: "#E6BA62", autumn: "#DD9260" },
    tint: { winter: "#A9C6D6", spring: "#E4A7B6", summer: "#E6BA62", autumn: "#DD9260" },
    radius: 22,
  },
} as const;

describe("look tokens match SPEC 4.1", () => {
  for (const look of LOOKS) {
    it(look, () => {
      const t = LOOK_TOKENS[look];
      const s = SPEC[look];
      expect(t.base).toEqual(s.bg);
      expect([t.text, t.muted, t.line]).toEqual([s.text, s.muted, s.line]);
      expect(t.accents).toEqual(s.accent);
      expect(t.tints).toEqual(s.tint);
      expect(t.frame.radius).toBe(s.radius);
    });
  }
  it("fonts per look", () => {
    expect(LOOK_TOKENS.journal.fonts.display).toMatch(/^"Fraunces Variable"/);
    expect(LOOK_TOKENS.journal.fonts.body).toMatch(/^"Instrument Sans Variable"/);
    expect(LOOK_TOKENS.greenhouse.fonts.display).toMatch(/^"Young Serif"/);
    expect(LOOK_TOKENS.greenhouse.fonts.body).toMatch(/^"Hanken Grotesk Variable"/);
    expect(LOOK_TOKENS.night.fonts.display).toMatch(/^"Instrument Serif"/);
    expect(LOOK_TOKENS.night.fonts.body).toMatch(/^"Geist Variable"/);
    expect([LOOK_TOKENS.journal.fonts.wordmarkStyle, LOOK_TOKENS.greenhouse.fonts.wordmarkStyle, LOOK_TOKENS.night.fonts.wordmarkStyle]).toEqual(["italic", "normal", "italic"]);
  });
});

describe("helpers", () => {
  it("rgba and mix", () => {
    expect(rgba("#3E5F75", 0.5)).toBe("rgba(62, 95, 117, 0.5)");
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(mix("#3E5F75", "#3E5F75", 0.3)).toBe("#3e5f75");
  });
  it("themeFor builds a full theme for every look and season", () => {
    for (const look of LOOKS)
      for (const season of SEASONS) {
        const th = themeFor(look, season);
        expect(th.accent).toBe(SPEC[look].accent[season]);
        expect(th.isNight).toBe(look === "night");
        expect(th.pageBackground(0)).toContain(SPEC[look].bg[0]);
        // Surfaces are shaded from a lighter tint of the accent to the accent (SPEC 4.1).
        expect(th.accentGradient).toMatch(/^linear-gradient\(/);
        expect(th.accentGradient.toLowerCase()).toContain(SPEC[look].accent[season].toLowerCase());
      }
  });
  it("the page tint deepens as the day fills", () => {
    const th = themeFor("journal", "winter");
    expect(th.pageBackground(0)).not.toBe(th.pageBackground(1));
  });
});
