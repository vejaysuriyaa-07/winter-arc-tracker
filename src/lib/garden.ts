// Garden engine math. Pure: no Date.now(), no DOM, no storage.
// Ported from docs/design/Garden.dc.html: seasons(), plantShape(), renderVals().
// GardenScene renders a SceneModel; the timelapse, arc cards and recap reuse it.
import type { AppState, Arc, Mood, Season } from "../types";
import { arcDaysSoFar, arcDayNumber, arcHabits, isFull, isKept, isScheduled, isDone, logOf } from "./stats";
import type { YMD } from "./dates";

// ---------- palettes ----------

export type ScenePalette = {
  ground1: string; ground2: string; grass: string; mound: string; trunk: string; leafA: string; leafB: string;
  pine: boolean; flowers: string[]; flowerRing: string; stem: string; bloomA: string; bloomB: string;
  precip: "snow" | "rain";
  sky: Record<Mood, [string, string]>;
};

export const SCENE_PALETTES: Record<Season, ScenePalette> = {
  winter: {
    ground1: "#E6EEF7", ground2: "#C3D2E3", grass: "#9FB3C8", mound: "#B4C3D4", trunk: "#5B4636", leafA: "#1E5F6B", leafB: "#2B7A86", pine: true,
    flowers: ["#F87171", "#93C5FD", "#FFFFFF"], flowerRing: "rgba(15, 23, 42, 0.14)", stem: "#2B7A86", bloomA: "#F87171", bloomB: "#FDE68A", precip: "snow",
    sky: { great: ["#6FAEE3", "#D9EEFB"], good: ["#5A8DC2", "#C3DBF0"], okay: ["#8695A8", "#CBD4DE"], low: ["#4F5E73", "#93A2B4"], rough: ["#1F2838", "#4E5A6E"] },
  },
  spring: {
    ground1: "#7FBF6A", ground2: "#5EA352", grass: "#4C8F44", mound: "#6A5640", trunk: "#6B4E3A", leafA: "#5DAA5A", leafB: "#F9A8D4", pine: false,
    flowers: ["#F9A8D4", "#FDE68A", "#FFFFFF", "#C4B5FD"], flowerRing: "rgba(0, 0, 0, 0.08)", stem: "#4C8F44", bloomA: "#F472B6", bloomB: "#FDE68A", precip: "rain",
    sky: { great: ["#7CC3F0", "#E6F5FF"], good: ["#86BFE6", "#EAF4FB"], okay: ["#9FAAB6", "#DCE2E8"], low: ["#6E7C8C", "#B0BAC4"], rough: ["#2D3542", "#5D6878"] },
  },
  summer: {
    ground1: "#8BC34A", ground2: "#6DAA3A", grass: "#558B2F", mound: "#7A5C3E", trunk: "#6D4C35", leafA: "#2E7D32", leafB: "#43A047", pine: false,
    flowers: ["#FACC15", "#FB923C", "#FFFFFF", "#F472B6"], flowerRing: "rgba(0, 0, 0, 0.08)", stem: "#558B2F", bloomA: "#FACC15", bloomB: "#B45309", precip: "rain",
    sky: { great: ["#2F96E8", "#BFE6FF"], good: ["#4FA6E3", "#D3ECFC"], okay: ["#94A4B3", "#D4DCE3"], low: ["#64748B", "#A6B2BF"], rough: ["#28323F", "#566373"] },
  },
  autumn: {
    ground1: "#C49A5A", ground2: "#A97E45", grass: "#8A6A3A", mound: "#6B4E33", trunk: "#5C4030", leafA: "#E07A2E", leafB: "#C2410C", pine: false,
    flowers: ["#F59E0B", "#DC2626", "#FDE68A"], flowerRing: "rgba(0, 0, 0, 0.1)", stem: "#8A6A3A", bloomA: "#F59E0B", bloomB: "#7C2D12", precip: "rain",
    sky: { great: ["#E9A35E", "#FCE3C2"], good: ["#C58B5C", "#EBD2B8"], okay: ["#9A8F86", "#D3CCC6"], low: ["#6A6560", "#A8A29C"], rough: ["#2E2A28", "#5C5552"] },
  },
};

export function rnd(i: number, k: number): number {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

// ---------- growth ----------

export function fullGrowthDays(lengthDays: number): number {
  return Math.max(7, Math.round(lengthDays * 0.78));
}

export function growth(daysDone: number, lengthDays: number): number {
  return Math.min(1, daysDone / fullGrowthDays(lengthDays));
}

export type PlantShape = {
  trunk: string; trunkW: string; trunkColor: string; moundRx: string; canopyOp: number; leafA: string; leafB: string;
  sprout: string; r1: string; r2: string; r3: string; r4: string;
  c1y: string; c2x: string; c2y: string; c3x: string; c3y: string; c4x: string; c4y: string;
  t1: string; t2: string; t3: string; cap: string;
};

const NONE = "M0 0";
const f1 = (n: number): string => n.toFixed(1);

/** Geometry of one plant in a 120x160 box, base at (60,157). Exact port of plantShape(). */
export function plantShape(g: number, wilt: boolean, pine: boolean, pal: ScenePalette): PlantShape {
  const H = 10 + g * 125;
  const T = 157 - H;
  const k = wilt ? 0.65 : 1;
  const out: PlantShape = {
    trunk: NONE, trunkW: f1(1.6 + g * 6), trunkColor: wilt ? "#8B7765" : pal.trunk, moundRx: f1(10 + g * 8),
    canopyOp: wilt ? 0.55 : 1, leafA: wilt ? "#7C6A58" : pal.leafA, leafB: wilt ? "#6B5B4D" : pal.leafB,
    sprout: NONE, r1: "0", r2: "0", r3: "0", r4: "0",
    c1y: f1(T), c2x: "60", c2y: f1(T), c3x: "60", c3y: f1(T), c4x: "60", c4y: f1(T),
    t1: NONE, t2: NONE, t3: NONE, cap: NONE,
  };
  if (g <= 0) return out;
  if (g < 0.08) {
    out.trunk = `M60 157L60 ${f1(T)}`;
    if (!wilt) {
      out.sprout = `M60 ${f1(T)}Q53 ${f1(T - 6)} 50 ${f1(T - 1)}Q56 ${f1(T + 2)} 60 ${f1(T)}ZM60 ${f1(T)}Q67 ${f1(T - 6)} 70 ${f1(T - 1)}Q64 ${f1(T + 2)} 60 ${f1(T)}Z`;
    }
    return out;
  }
  if (pine) {
    out.trunk = `M60 157L60 ${f1(157 - H * 0.35)}`;
    const w = (10 + g * 52) * k;
    const tri = (base: number, apex: number, width: number): string =>
      `M${f1(60 - width / 2)} ${f1(157 - H * base)}L60 ${f1(157 - H * apex)}L${f1(60 + width / 2)} ${f1(157 - H * base)}Z`;
    out.t1 = tri(0.3, 0.68, w);
    out.t2 = tri(0.52, 0.88, w * 0.78);
    out.t3 = tri(0.72, 1.06, w * 0.55);
    if (!wilt) out.cap = tri(0.95, 1.06, w * 0.2);
    return out;
  }
  out.trunk = `M60 157C59 ${f1(157 - H * 0.4)} 61 ${f1(157 - H * 0.7)} 60 ${f1(T)}`;
  out.r1 = f1((5 + g * 24) * k);
  out.c1y = f1(T + 2);
  if (g > 0.25) {
    out.r2 = f1((4 + g * 17) * k);
    out.c2x = f1(60 - 6 - g * 14);
    out.c2y = f1(T + 6 + g * 8);
    out.r3 = f1((4 + g * 16) * k);
    out.c3x = f1(60 + 6 + g * 14);
    out.c3y = f1(T + 8 + g * 7);
  }
  if (g > 0.55) {
    out.r4 = f1((3 + g * 13) * k);
    out.c4x = "62";
    out.c4y = f1(T - 4 - g * 8);
  }
  return out;
}

// ---------- slots ----------

export type Slot = { x: number; b: number; s: number; row: "back" | "front" };

/** Widest mound half-width at full growth (10 + 1 * 8). */
export const MAX_MOUND_RX = 18;

const DESIGN_SLOTS: readonly Slot[] = [
  { x: 34, b: 112, s: 0.72, row: "back" }, { x: 70, b: 66, s: 1, row: "front" },
  { x: 108, b: 118, s: 0.72, row: "back" }, { x: 146, b: 66, s: 1, row: "front" },
  { x: 182, b: 114, s: 0.72, row: "back" }, { x: 222, b: 70, s: 1, row: "front" },
  { x: 256, b: 120, s: 0.72, row: "back" }, { x: 298, b: 72, s: 1, row: "front" },
  { x: 328, b: 114, s: 0.72, row: "back" },
];

/** Nine design slots in two rows; fewer plants spread over them; more narrow the spacing and shrink. */
export function plantSlots(n: number): Slot[] {
  if (n <= 0) return [];
  if (n <= 9) {
    if (n === 9) return [...DESIGN_SLOTS];
    return Array.from({ length: n }, (_, i) => DESIGN_SLOTS[Math.round(((i + 0.5) * 9) / n - 0.5)]!);
  }
  const left = 22;
  const right = 336;
  const step = (right - left) / (n - 1);
  const sameRowGap = step * 2;
  const k = Math.min(1, (sameRowGap - 0.5) / (2 * MAX_MOUND_RX)); // half a pixel between bases
  const backB = [112, 118, 114, 120, 114];
  const frontB = [66, 66, 70, 72];
  return Array.from({ length: n }, (_, i) => {
    const back = i % 2 === 0;
    const j = Math.floor(i / 2);
    return back
      ? { x: left + i * step, b: backB[j % backB.length]!, s: 0.72 * k, row: "back" as const }
      : { x: left + i * step, b: frontB[j % frontB.length]!, s: k, row: "front" as const };
  });
}

// ---------- flowers, birds ----------

export type Flower = { x: number; y: number; s: number; color: string; ring: string; gold: boolean };

export const WILDFLOWERS = 5;
const MAX_FLOWERS = 120;

/** Five wildflowers, then one per kept day (gold centre when full). Seeded by index, so they never move. */
export function flowerLayout(kept: readonly { full: boolean }[], season: Season): Flower[] {
  const pal = SCENE_PALETTES[season];
  const total = Math.min(MAX_FLOWERS, WILDFLOWERS + kept.length);
  const out: Flower[] = [];
  for (let i = 0; i < total; i++) {
    out.push({
      x: Math.round(6 + rnd(i, 1) * 340),
      y: Math.round(6 + rnd(i, 2) * 50),
      s: Math.round(4 + rnd(i, 3) * 4),
      color: pal.flowers[i % pal.flowers.length]!,
      ring: pal.flowerRing,
      gold: i >= WILDFLOWERS && kept[i - WILDFLOWERS]!.full,
    });
  }
  return out;
}

export function birdCount(progress: number): number {
  if (progress < 0.15) return 0;
  if (progress < 0.35) return 1;
  if (progress < 0.6) return 2;
  if (progress < 0.9) return 3;
  return 5;
}

// ---------- weather and sky ----------

export type SkyEvents = {
  night: boolean;
  fireflies: boolean;
  brightStars: boolean;
  aurora: boolean;
  rainbow: boolean;
  shootingStar: boolean;
};

export const NO_EVENTS: SkyEvents = { night: false, fireflies: false, brightStars: false, aurora: false, rainbow: false, shootingStar: false };

export type Weather = { clouds: number; cloudColor: string; drops: number; precip: "snow" | "rain"; wind: number };

const CLOUDS: Record<Mood, number> = { great: 0, good: 2, okay: 4, low: 5, rough: 5 };
const CLOUD_COLOR: Record<Mood, string> = { great: "#FFFFFF", good: "rgba(255, 255, 255, 0.92)", okay: "#E5EAF0", low: "#9AA7B6", rough: "#4B5567" };
const SNOW: Record<Mood, number> = { great: 8, good: 12, okay: 16, low: 30, rough: 46 };
const RAIN: Record<Mood, number> = { great: 0, good: 0, okay: 0, low: 30, rough: 50 };

export function weather(season: Season, mood: Mood, ev: SkyEvents): Weather {
  const precip = SCENE_PALETTES[season].precip;
  const snow = precip === "snow";
  const clouds = ev.night ? 0 : ev.rainbow ? 2 : CLOUDS[mood];
  const drops = ev.rainbow ? 0 : ev.night ? (snow ? 10 : 0) : snow ? SNOW[mood] : RAIN[mood];
  const wind = mood === "rough" ? 2.2 : mood === "low" ? 1.5 : 1;
  return { clouds, cloudColor: CLOUD_COLOR[mood], drops, precip, wind };
}

export function skyColors(season: Season, mood: Mood, ev: SkyEvents): [string, string] {
  if (ev.night) return ["#060B1E", "#22305A"];
  if (ev.rainbow) return ["#7FA9CC", "#E6F0F7"];
  return SCENE_PALETTES[season].sky[mood];
}

// ---------- scene model ----------

export type PlantInput = { id: string; daysDone: number; wilt: boolean };

export type SceneInput = {
  season: Season;
  mood: Mood;
  events: SkyEvents;
  lengthDays: number;
  /** 1-based arc day being drawn; 0 or less before the arc starts. */
  dayNumber: number;
  plants: PlantInput[];
  keptDays: { full: boolean }[];
  bloom: boolean;
  visitorId?: string | null;
};

export type ScenePlant = PlantShape & { id: string; g: number; wilt: boolean; lean: number; phase: number; slot: Slot };
export type Star = { x: number; y: number; s: number; o: number; sp: number };
export type Firefly = { x: number; y: number; sx: number; sy: number };
export type Drop = { x: number; off: number; speed: number; w: number; h: number; round: boolean; color: string };

export type SceneModel = {
  season: Season;
  mood: Mood;
  events: SkyEvents;
  palette: ScenePalette;
  sky: [string, string];
  sun: boolean;
  moon: boolean;
  stars: Star[];
  aurora: number;
  rainbow: boolean;
  shootingStar: boolean;
  clouds: { y: number }[];
  cloudColor: string;
  cloudOpacity: number;
  plants: ScenePlant[];
  flowers: Flower[];
  bloom: boolean;
  visitorId: string | null;
  overlay: string | null;
  fireflies: Firefly[];
  birds: { y: number }[];
  birdColor: string;
  drops: Drop[];
  precip: "snow" | "rain";
  wind: number;
  /** Elements the animation loop moves each frame (plants, birds, clouds, drops, stars, fireflies, aurora). */
  animatedNodes: number;
};

export const NODE_CAP = 150;
const BIRD_Y = [38, 60, 28, 74, 50];
const CLOUD_Y = [18, 46, 30, 64, 10];

export function sceneModel(input: SceneInput): SceneModel {
  const { season, mood, events: ev } = input;
  const pal = SCENE_PALETTES[season];
  const w = weather(season, mood, ev);
  const snow = w.precip === "snow";
  const started = input.dayNumber >= 1;

  const slots = plantSlots(input.plants.length);
  const plants: ScenePlant[] = input.plants.map((p, i) => {
    const gr = started ? growth(p.daysDone, input.lengthDays) : 0;
    return { ...plantShape(gr, p.wilt, pal.pine, pal), id: p.id, g: gr, wilt: p.wilt, lean: p.wilt ? 9 : 0, phase: i * 0.9, slot: slots[i]! };
  });

  const nBirds = started ? birdCount(Math.min(1, input.dayNumber / input.lengthDays)) : 0;
  const birds = BIRD_Y.slice(0, nBirds).map((y) => ({ y }));
  const clouds = CLOUD_Y.slice(0, w.clouds).map((y) => ({ y }));

  const stars: Star[] = [];
  if (ev.night) {
    const n = ev.brightStars ? 48 : 34;
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.round(rnd(i, 7) * 350),
        y: Math.round(rnd(i, 8) * 130),
        s: rnd(i, 9) > 0.8 ? 3 : 2,
        o: Math.min(1, 0.5 + rnd(i, 10) * 0.5 + (ev.brightStars ? 0.25 : 0)),
        sp: 0.8 + rnd(i, 11) * 2,
      });
    }
  }
  const fireflies: Firefly[] = [];
  if (ev.night && ev.fireflies) {
    for (let i = 0; i < 14; i++) {
      fireflies.push({ x: Math.round(20 + rnd(i, 12) * 320), y: Math.round(170 + rnd(i, 13) * 100), sx: 0.3 + rnd(i, 14) * 0.5, sy: 0.4 + rnd(i, 15) * 0.6 });
    }
  }
  const aurora = ev.night && ev.aurora ? 3 : 0;

  // Keep the animated budget: precipitation gives way first, then fireflies, then stars.
  // Plants, birds, clouds and aurora always stay.
  const core = plants.length + birds.length + clouds.length + aurora;
  fireflies.splice(Math.max(0, NODE_CAP - core));
  stars.splice(Math.max(0, NODE_CAP - core - fireflies.length));
  const fixed = core + stars.length + fireflies.length;
  const nDrops = Math.max(0, Math.min(w.drops, NODE_CAP - fixed));
  const drops: Drop[] = [];
  for (let i = 0; i < nDrops; i++) {
    drops.push({
      x: (i * 47) % 356,
      off: (i * 73) % 300,
      speed: snow ? 22 + (i % 5) * 6 : 240 + (i % 4) * 40,
      w: snow ? 3 : 1.2,
      h: snow ? 3 : 10,
      round: snow,
      color: snow ? "rgba(255, 255, 255, 0.95)" : "rgba(225, 236, 250, 0.75)",
    });
  }

  const dark = mood === "low" || mood === "rough" || ev.night;
  return {
    season, mood, events: ev, palette: pal,
    sky: skyColors(season, mood, ev),
    sun: (mood === "great" || mood === "good" || ev.rainbow) && !ev.night,
    moon: ev.night,
    stars, aurora,
    rainbow: ev.rainbow && !ev.night,
    shootingStar: ev.shootingStar,
    clouds, cloudColor: w.cloudColor, cloudOpacity: mood === "good" ? 0.9 : 1,
    plants,
    flowers: flowerLayout(started ? input.keptDays : [], season),
    bloom: started && input.bloom,
    visitorId: input.visitorId ?? null,
    overlay: ev.night ? (ev.aurora ? "rgba(8, 12, 32, 0.32)" : "rgba(8, 12, 32, 0.5)") : null,
    fireflies, birds,
    birdColor: dark ? "#E2E8F0" : "#1E293B",
    drops, precip: w.precip, wind: w.wind,
    animatedNodes: fixed + drops.length,
  };
}

/** The scene for an arc as it stood on `day` (today for the live garden, day N for the timelapse). */
export function gardenFromState(state: AppState, arc: Arc, day: YMD, events: SkyEvents, visitorId: string | null = null): SceneModel {
  const dayNumber = arcDayNumber(arc, day);
  const habits = arcHabits(state, arc.id);
  const before = dayNumber < 1;
  const shown = before
    ? habits.filter((h) => h.archivedAt === undefined || h.archivedAt > arc.startDate)
    : habits.filter((h) => h.createdAt <= day);
  const days = arcDaysSoFar(arc, day);
  const plants: PlantInput[] = shown.map((h) => ({
    id: h.id,
    daysDone: before ? 0 : days.filter((d) => isScheduled(h, d) && isDone(state, h, d)).length,
    wilt: !before && h.archivedAt !== undefined && h.archivedAt <= day,
  }));
  const keptDays = days.filter((d) => isKept(state, arc, d) === true).map((d) => ({ full: isFull(state, arc, d) }));
  return sceneModel({
    season: arc.season,
    mood: logOf(state, arc.id, day)?.mood ?? "good",
    events,
    lengthDays: arc.lengthDays,
    dayNumber,
    plants,
    keptDays,
    bloom: !before && isFull(state, arc, day),
    visitorId,
  });
}

/** The theme picker's preview: the person's own garden in another season, or day-1 seeds for a new arc. */
export function previewModel(state: AppState, arc: Arc | undefined, day: YMD, season: Season, habitCount: number): SceneModel {
  if (arc) return gardenFromState(state, { ...arc, season }, day, NO_EVENTS);
  return sceneModel({
    season, mood: "good", events: NO_EVENTS, lengthDays: 90, dayNumber: 1,
    plants: Array.from({ length: habitCount }, (_, i) => ({ id: `new-${i}`, daysDone: 0, wilt: false })),
    keptDays: [], bloom: false,
  });
}
