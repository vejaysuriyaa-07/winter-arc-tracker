// Every UI colour, font and surface for the three looks x four seasons.
// Source: docs/design/Skin.dc.html (renderVals) and SPEC-v2 section 4.1.
// Pure: no DOM. ThemeProvider turns a Theme into CSS variables.
import type { Look, Season } from "../types";

type Hex = string;

export type LookTokens = {
  text: Hex;
  muted: Hex;
  line: Hex;
  surface: Hex;
  onAccent: Hex;
  ring: Hex;
  base: [Hex, Hex];
  accents: Record<Season, Hex>;
  tints: Record<Season, Hex>;
  fonts: { display: string; body: string; wordmark: string; wordmarkStyle: "italic" | "normal"; wordmarkWeight: number; wordmarkSize: number; headingWeight: number };
  list: "divider" | "tiles" | "grouped";
  mood: "circles" | "tiles" | "segmented";
  chip: "text" | "pill";
  input: "underline" | "field";
  frame: { radius: number; border: string; shadow: (accent: Hex) => string };
};

export const LOOK_TOKENS: Record<Look, LookTokens> = {
  journal: {
    text: "#272520", muted: "#6B6555", line: "#DCD3C2", surface: "#FBF8F1", onAccent: "#FBF8F1", ring: "#B6AC98",
    base: ["#F8F4EB", "#EFE8DB"],
    accents: { winter: "#3E5F75", spring: "#9E4C66", summer: "#7D5A0C", autumn: "#9C4A26" },
    tints: { winter: "#D3E3EE", spring: "#F2D6DE", summer: "#F3E2B8", autumn: "#F1D4C0" },
    fonts: { display: '"Fraunces Variable", Georgia, serif', body: '"Instrument Sans Variable", system-ui, sans-serif', wordmark: "Grove", wordmarkStyle: "italic", wordmarkWeight: 500, wordmarkSize: 24, headingWeight: 500 },
    list: "divider", mood: "circles", chip: "text", input: "underline",
    frame: { radius: 20, border: "1px solid #DCD3C2", shadow: () => "0 22px 36px -26px rgba(39, 37, 32, 0.55)" },
  },
  greenhouse: {
    text: "#1D2820", muted: "#5B675C", line: "#CBD2C2", surface: "#F2F4ED", onAccent: "#F6F8F2", ring: "#A3AD98",
    base: ["#ECEFE6", "#DDE2D3"],
    accents: { winter: "#355A6E", spring: "#8E4560", summer: "#76600F", autumn: "#8E4423" },
    tints: { winter: "#C9DCE4", spring: "#E8D0DA", summer: "#E7DFB8", autumn: "#E8CDBE" },
    fonts: { display: '"Young Serif", Georgia, serif', body: '"Hanken Grotesk Variable", system-ui, sans-serif', wordmark: "grove", wordmarkStyle: "normal", wordmarkWeight: 400, wordmarkSize: 24, headingWeight: 400 },
    list: "tiles", mood: "tiles", chip: "pill", input: "field",
    frame: { radius: 26, border: "none", shadow: () => "0 1px 0 rgba(255, 255, 255, 0.8), 0 18px 32px -16px rgba(29, 40, 32, 0.4)" },
  },
  night: {
    text: "#EDE6D5", muted: "#A39D8C", line: "#2A3026", surface: "#1A1E17", onAccent: "#121510", ring: "#4A5244",
    base: ["#151913", "#0D100B"],
    accents: { winter: "#A9C6D6", spring: "#E4A7B6", summer: "#E6BA62", autumn: "#DD9260" },
    tints: { winter: "#A9C6D6", spring: "#E4A7B6", summer: "#E6BA62", autumn: "#DD9260" },
    fonts: { display: '"Instrument Serif", Georgia, serif', body: '"Geist Variable", system-ui, sans-serif', wordmark: "Grove", wordmarkStyle: "italic", wordmarkWeight: 400, wordmarkSize: 28, headingWeight: 400 },
    list: "grouped", mood: "segmented", chip: "pill", input: "field",
    frame: { radius: 22, border: "none", shadow: (accent) => `0 0 0 1px rgba(237, 230, 213, 0.06), 0 24px 48px -22px ${rgba(accent, 0.45)}` },
  },
};

export const GOLD = "#F5B83D";
export const MISS = "#F87171";

// ---------- colour helpers ----------

function rgb(hex: Hex): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: Hex, a: number | string): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function mix(a: Hex, b: Hex, k: number): Hex {
  const x = rgb(a);
  const y = rgb(b);
  const h = (v: number) => `0${Math.round(v).toString(16)}`.slice(-2);
  return `#${h(x[0] + (y[0] - x[0]) * k)}${h(x[1] + (y[1] - x[1]) * k)}${h(x[2] + (y[2] - x[2]) * k)}`;
}

/** Seeded pseudo-random in [0,1), same formula as the designs. */
export function rnd(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

// ---------- resolved theme ----------

export type MoodButtonStyle = { radius: number; border: string; background: string; color: string; shadow: string };
export type RowStyle = { background: string; shadow: string; radius: number; divider: string };

export type Theme = {
  look: Look;
  season: Season;
  isNight: boolean;
  t: LookTokens;
  accent: Hex;
  tint: Hex;
  /** Lighter tint of the accent shading into the accent (buttons, checks, primary). */
  accentGradient: string;
  progressFill: string;
  progressTrack: string;
  dateInk: string;
  navBackground: string;
  pageBackground: (progress: number) => string;
  frame: { radius: number; border: string; shadow: string };
  row: (done: boolean, last: boolean) => RowStyle;
  listWrap: { gap: number; background: string; radius: number; borderTop: string; shadow: string; padL: number; padR: number };
  moodButton: (selected: boolean) => MoodButtonStyle;
  moodWrap: { gap: number; pad: number; radius: number; background: string; shadow: string };
  input: { padX: number; underline: string; radius: number; background: string; buttonBackground: string; buttonColor: string; buttonShadow: string };
  chip: { padX: number; background: string; border: string };
  card: { background: string; border: string; radius: number; shadow: string };
  fx: {
    spark: Hex; sparkGlow: string; ripple: Hex; sweep: string;
    flameTop: Hex; flameBottom: Hex; flameCore: Hex; flameText: Hex; flameFilter: string;
    drop: Hex; flake: Hex; sparkIcon: Hex; cloud: Hex;
  };
  checkFill: (done: boolean) => string;
  checkRing: (done: boolean) => Hex;
  streakColor: (done: boolean) => Hex;
};

export function themeFor(look: Look, season: Season): Theme {
  const t = LOOK_TOKENS[look];
  const night = look === "night";
  const accent = t.accents[season];
  const tint = t.tints[season];
  const accentGradient = `linear-gradient(150deg, ${mix(accent, "#FFFFFF", 0.22)} 0%, ${accent} 100%)`;

  const listWrap = {
    divider: { gap: 0, background: "transparent", radius: 0, borderTop: `1px solid ${t.line}`, shadow: "none", padL: 4, padR: 4 },
    grouped: { gap: 0, background: "linear-gradient(180deg, #1C2119 0%, #171B14 100%)", radius: 20, borderTop: "none", shadow: "0 0 0 1px rgba(237, 230, 213, 0.05), 0 24px 40px -24px rgba(0, 0, 0, 0.8)", padL: 16, padR: 14 },
    tiles: { gap: 6, background: "transparent", radius: 0, borderTop: "none", shadow: "none", padL: 16, padR: 14 },
  }[t.list];

  const row = (done: boolean, last: boolean): RowStyle => {
    if (t.list === "divider")
      return { background: done ? `linear-gradient(90deg, ${rgba(tint, 0.75)} 0%, ${rgba(tint, 0)} 85%)` : "transparent", shadow: "none", radius: 0, divider: `1px solid ${t.line}` };
    if (t.list === "tiles")
      return {
        background: done ? `linear-gradient(135deg, ${t.surface} 0%, ${rgba(tint, 0.95)} 100%)` : `linear-gradient(180deg, ${t.surface} 0%, ${mix(t.surface, "#DDE2D3", 0.35)} 100%)`,
        shadow: done ? `0 1px 0 rgba(255, 255, 255, 0.7) inset, 0 8px 18px -12px ${rgba(accent, 0.55)}` : "0 1px 0 rgba(255, 255, 255, 0.7) inset, 0 6px 14px -12px rgba(29, 40, 32, 0.35)",
        radius: 16,
        divider: "none",
      };
    return {
      background: done ? `linear-gradient(90deg, ${rgba(accent, 0.16)} 0%, ${rgba(accent, 0)} 80%)` : "transparent",
      shadow: done ? `inset 3px 0 0 ${accent}` : "none",
      radius: 0,
      divider: last ? "none" : `1px solid ${t.line}`,
    };
  };

  const moodButton = (sel: boolean): MoodButtonStyle => {
    if (t.mood === "circles")
      return {
        radius: 999,
        border: `1px solid ${sel ? t.text : t.line}`,
        background: sel ? "linear-gradient(160deg, #3D3A33 0%, #1C1B17 100%)" : `linear-gradient(180deg, #FBF8F1 0%, ${rgba(tint, 0.5)} 100%)`,
        color: sel ? "#FBF8F1" : t.muted,
        shadow: sel ? "0 8px 16px -10px rgba(39, 37, 32, 0.8)" : "none",
      };
    if (t.mood === "segmented")
      return {
        radius: 12, border: "none",
        background: sel ? "linear-gradient(180deg, #2C3227 0%, #22271F 100%)" : "transparent",
        color: sel ? accent : t.muted,
        shadow: sel ? `0 0 18px -4px ${rgba(accent, 0.55)}` : "none",
      };
    return {
      radius: 16, border: "none",
      background: sel ? accentGradient : `linear-gradient(180deg, ${t.surface} 0%, ${mix(t.surface, "#DDE2D3", 0.45)} 100%)`,
      color: sel ? t.onAccent : t.muted,
      shadow: sel ? `0 10px 18px -10px ${rgba(accent, 0.8)}` : "0 1px 0 rgba(255, 255, 255, 0.7) inset",
    };
  };

  const moodWrap = t.mood === "segmented"
    ? { gap: 4, pad: 4, radius: 16, background: "linear-gradient(180deg, #1C2119 0%, #161A13 100%)", shadow: "0 0 0 1px rgba(237, 230, 213, 0.05)" }
    : { gap: 8, pad: 0, radius: 0, background: "transparent", shadow: "none" };

  const input = t.input === "underline"
    ? { padX: 4, underline: `1px solid ${t.line}`, radius: 0, background: "transparent", buttonBackground: "transparent", buttonColor: accent, buttonShadow: "none" }
    : night
      ? { padX: 16, underline: "none", radius: 14, background: "#1A1E17", buttonBackground: `linear-gradient(150deg, ${mix(accent, "#FFFFFF", 0.2)} 0%, ${accent} 100%)`, buttonColor: t.onAccent, buttonShadow: `0 0 20px -6px ${rgba(accent, 0.7)}` }
      : { padX: 16, underline: "none", radius: 14, background: t.surface, buttonBackground: accentGradient, buttonColor: t.onAccent, buttonShadow: `0 10px 18px -10px ${rgba(accent, 0.8)}` };

  const chip = t.chip === "text"
    ? { padX: 4, background: "transparent", border: "none" }
    : night
      ? { padX: 14, background: "#1A1E17", border: "1px solid rgba(237, 230, 213, 0.06)" }
      : { padX: 14, background: `linear-gradient(180deg, ${t.surface} 0%, ${rgba(tint, 0.6)} 100%)`, border: "none" };

  // Cards (tiles, sheets, chain card) follow the list style of the look.
  const card = t.list === "divider"
    ? { background: `linear-gradient(180deg, ${rgba("#FBF8F1", 0.9)} 0%, ${rgba(tint, 0.25)} 100%)`, border: `1px solid ${t.line}`, radius: 18, shadow: "0 18px 30px -28px rgba(39, 37, 32, 0.5)" }
    : t.list === "tiles"
      ? { background: `linear-gradient(180deg, ${t.surface} 0%, ${mix(t.surface, "#DDE2D3", 0.35)} 100%)`, border: "none", radius: 20, shadow: "0 1px 0 rgba(255, 255, 255, 0.7) inset, 0 10px 22px -16px rgba(29, 40, 32, 0.4)" }
      : { background: "linear-gradient(180deg, #1C2119 0%, #171B14 100%)", border: "none", radius: 20, shadow: "0 0 0 1px rgba(237, 230, 213, 0.05), 0 24px 40px -24px rgba(0, 0, 0, 0.8)" };

  const pageBackground = (p: number): string =>
    night
      ? `radial-gradient(120% 45% at 50% -8%, ${rgba(accent, (0.08 + 0.12 * p).toFixed(3))} 0%, rgba(18, 21, 16, 0) 62%), linear-gradient(180deg, ${t.base[0]} 0%, ${t.base[1]} 100%)`
      : `radial-gradient(130% 50% at 50% -6%, ${rgba(tint, (0.55 + 0.45 * p).toFixed(3))} 0%, ${rgba(tint, 0)} 64%), radial-gradient(90% 40% at 100% 100%, ${rgba(tint, 0.35)} 0%, ${rgba(tint, 0)} 70%), linear-gradient(180deg, ${t.base[0]} 0%, ${t.base[1]} 100%)`;

  return {
    look, season, isNight: night, t, accent, tint, accentGradient,
    progressFill: `linear-gradient(90deg, ${mix(accent, "#FFFFFF", 0.35)} 0%, ${accent} 100%)`,
    progressTrack: night ? "rgba(237, 230, 213, 0.08)" : rgba(t.line, 0.7),
    dateInk: night ? `linear-gradient(180deg, #F6F0E3 25%, ${accent} 140%)` : `linear-gradient(180deg, ${t.text} 35%, ${accent} 150%)`,
    navBackground: night ? "rgba(13, 16, 11, 0.92)" : rgba(t.base[1], 0.94),
    pageBackground,
    frame: { radius: t.frame.radius, border: t.frame.border, shadow: t.frame.shadow(accent) },
    row, listWrap, moodButton, moodWrap, input, chip, card,
    fx: {
      spark: night ? "#F6E7A8" : accent,
      sparkGlow: night ? "0 0 10px 3px rgba(246, 231, 168, 0.7)" : "none",
      ripple: night ? "#F6E7A8" : accent,
      sweep: `linear-gradient(90deg, ${rgba(night ? accent : tint, 0)} 0%, ${rgba(night ? accent : tint, night ? 0.32 : 0.9)} 50%, ${rgba(night ? accent : tint, 0)} 100%)`,
      flameTop: night ? "#FFE3A1" : "#F2B648",
      flameBottom: night ? "#F0823A" : "#C9541F",
      flameCore: night ? "#FFF6D8" : "#FBE3A6",
      flameText: night ? "#F2B061" : "#B5561F",
      flameFilter: night ? "drop-shadow(0 0 3px rgba(240, 138, 60, 0.65))" : "none",
      drop: night ? "#A9C6D6" : "#5E8FAE",
      flake: night ? "#EAF2F8" : "#6F95B0",
      sparkIcon: night ? "#FFE3A1" : "#D99A1E",
      cloud: night ? "#7D877A" : "#B3AC9C",
    },
    checkFill: (done) => (done ? `linear-gradient(145deg, ${mix(accent, "#FFFFFF", 0.28)} 0%, ${accent} 70%)` : "transparent"),
    checkRing: (done) => (done ? accent : t.ring),
    streakColor: (done) => (done ? (night ? accent : mix(accent, "#000000", 0.05)) : t.muted),
  };
}
