// Visitors (SPEC 7.3): nine per season on the same rule ladder. Pure: `today` passed in.
import type { AppState, Arc, Season, VisitorFound } from "../types";
import { arcDaysSoFar, arcEnd, bestChain, bestFullRun, chain, fullDays, fullRun, isFull, keptDays, perfectWeeks } from "./stats";
import { minDay, type YMD } from "./dates";

export type Rule = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Visitor = { id: string; season: Season; name: string; rule: Rule };

const NAMES: Record<Season, string[]> = {
  winter: ["Robin", "Cardinal", "Rabbit", "Squirrel", "Red fox", "Deer", "Snowy owl", "Northern lights", "Shooting star"],
  spring: ["Bee", "Butterfly", "Songbird", "Hedgehog", "Fawn", "Swan", "Rabbit family", "Blossom rain", "Rainbow moth"],
  summer: ["Ladybug", "Dragonfly", "Frog", "Hummingbird", "Turtle", "Heron", "Fireflies", "Meteor shower", "Golden butterfly"],
  autumn: ["Squirrel", "Hedgehog", "Crow", "Owl", "Fox", "Elk", "Geese", "Harvest moon", "White deer"],
};

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z]+/g, "-");

export const VISITORS: Record<Season, Visitor[]> = Object.fromEntries(
  (Object.keys(NAMES) as Season[]).map((season) => [
    season,
    NAMES[season].map((name, i) => ({ id: `${season}-${slug(name)}`, season, name, rule: (i + 1) as Rule })),
  ]),
) as Record<Season, Visitor[]>;

export const ALL_VISITORS: Visitor[] = Object.values(VISITORS).flat();

export function visitorById(id: string): Visitor | undefined {
  return ALL_VISITORS.find((v) => v.id === id);
}

const BASE: Record<Exclude<Rule, 9>, number> = { 1: 3, 2: 5, 3: 10, 4: 15, 5: 7, 6: 1, 7: 30, 8: 2 };

/** The count a rule needs in an arc of this length (scaled below 90 days, minimum 3; weeks unscaled). */
export function target(rule: Exclude<Rule, 9> | number, lengthDays: number): number {
  const base = BASE[rule as Exclude<Rule, 9>];
  if (rule === 6 || rule === 8) return base;
  return Math.max(3, Math.round(base * Math.min(1, lengthDays / 90)));
}

export function ruleText(rule: Rule, lengthDays: number): string {
  if (rule === 9) return "Rare, on any full day";
  const n = target(rule, lengthDays);
  return {
    1: `${n} kept days in a row`, 2: `${n} full days`, 3: `${n} kept days`, 4: `${n} kept days`, 5: `${n} full days in a row`,
    6: "A perfect week, Mon to Sun", 7: `${n} full days`, 8: `${n} perfect weeks`,
  }[rule];
}

// ---------- rare roll ----------

/** FNV-1a: a small stable hash so "1 in 50" is the same on every device and in tests. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

export function rareRoll(arcId: string, date: YMD): boolean {
  return hash(`${arcId}|${date}|rare`) < 1 / 50;
}

// ---------- evaluation ----------

/** Current value toward the rule as of `today` (runs use the current run; `met` uses the best). */
function measure(state: AppState, arc: Arc, rule: Rule, today: YMD): { current: number; best: number } {
  switch (rule) {
    case 1: return { current: chain(state, arc, today), best: bestChain(state, arc, today) };
    case 2: case 7: { const n = fullDays(state, arc, today); return { current: n, best: n }; }
    case 3: case 4: { const n = keptDays(state, arc, today); return { current: n, best: n }; }
    case 5: return { current: fullRun(state, arc, today), best: bestFullRun(state, arc, today) };
    case 6: case 8: { const n = perfectWeeks(state, arc, today).length; return { current: n, best: n }; }
    case 9: { const n = arcDaysSoFar(arc, today).some((d) => rareRoll(arc.id, d) && isFull(state, arc, d)) ? 1 : 0; return { current: n, best: n }; } // cheap roll first
  }
}

function isMet(state: AppState, arc: Arc, rule: Rule, today: YMD): boolean {
  const need = rule === 9 ? 1 : target(rule, arc.lengthDays);
  return measure(state, arc, rule, today).best >= need;
}

export type Met = { visitor: Visitor; firstDay: YMD };

/** Visitors of the arc's season whose rule holds by `today`, with the first day it held (rules only ever become true). */
export function metVisitors(state: AppState, arc: Arc, today: YMD, skip: ReadonlySet<string> = new Set()): Met[] {
  const days = arcDaysSoFar(arc, minDay(today, arcEnd(arc)));
  if (days.length === 0) return [];
  const last = days[days.length - 1]!;
  const out: Met[] = [];
  for (const visitor of VISITORS[arc.season]) {
    if (skip.has(visitor.id) || !isMet(state, arc, visitor.rule, last)) continue;
    // Binary search for the first day: every rule is monotonic in the day.
    let lo = 0;
    let hi = days.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (isMet(state, arc, visitor.rule, days[mid]!)) hi = mid;
      else lo = mid + 1;
    }
    out.push({ visitor, firstDay: days[lo]! });
  }
  return out;
}

export type Progress = { visitor: Visitor; current: number; target: number; fraction: number; met: boolean };

export function visitorProgress(state: AppState, arc: Arc, today: YMD): Progress[] {
  return VISITORS[arc.season].map((visitor) => {
    const need = visitor.rule === 9 ? 1 : target(visitor.rule, arc.lengthDays);
    const m = measure(state, arc, visitor.rule, minDay(today, arcEnd(arc)));
    const current = Math.min(need, m.current);
    return { visitor, current, target: need, fraction: current / need, met: m.best >= need };
  });
}

/** The closest locked visitor of the arc's season: highest progress, ties in ladder order; the rare one last. */
export function nextVisitor(state: AppState, arc: Arc, today: YMD, foundIds: ReadonlySet<string>): Progress | null {
  const open = visitorProgress(state, arc, today).filter((p) => !foundIds.has(p.visitor.id) && !p.met);
  const ladder = open.filter((p) => p.visitor.rule !== 9);
  const pool = ladder.length ? ladder : open;
  let best: Progress | null = null;
  for (const p of pool) if (!best || p.fraction > best.fraction) best = p;
  return best;
}

const article = (name: string): string => (/^[AEIOU]/.test(name) ? "an" : "a");

/** Visitors that are not one creature: [subject, verb for "visits", arrival line]. */
const SPECIAL: Record<string, { teaser: string; arrival: string }> = {
  "winter-northern-lights": { teaser: "the northern lights come out", arrival: "The northern lights came out" },
  "winter-shooting-star": { teaser: "a shooting star might cross", arrival: "A shooting star crossed the sky" },
  "spring-rabbit-family": { teaser: "the rabbit family visits", arrival: "The rabbit family moved in" },
  "spring-blossom-rain": { teaser: "blossom rain falls", arrival: "Blossom rain fell on the garden" },
  "summer-fireflies": { teaser: "the fireflies come", arrival: "Fireflies moved in" },
  "summer-meteor-shower": { teaser: "a meteor shower falls", arrival: "A meteor shower lit the sky" },
  "autumn-geese": { teaser: "the geese visit", arrival: "The geese moved in" },
  "autumn-harvest-moon": { teaser: "a harvest moon rises", arrival: "A harvest moon rose" },
};

/** The toast when a visitor arrives ("A <visitor> moved in", SPEC 7.3). */
export function arrivalLine(v: Visitor): string {
  const s = SPECIAL[v.id];
  if (s) return s.arrival;
  return `${article(v.name) === "an" ? "An" : "A"} ${v.name} moved in`;
}

function subject(v: Visitor): string {
  return SPECIAL[v.id]?.teaser ?? `${article(v.name)} ${v.name} visits`;
}

export function teaser(p: Progress): string {
  const left = p.target - p.current;
  const name = p.visitor.name;
  const unit: Record<Rule, [string, string]> = {
    1: ["more kept day in a row", "more kept days in a row"],
    2: ["more full day", "more full days"], 7: ["more full day", "more full days"],
    3: ["more kept day", "more kept days"], 4: ["more kept day", "more kept days"],
    5: ["more full day in a row", "more full days in a row"],
    6: ["perfect week", "perfect weeks"], 8: ["more perfect week", "more perfect weeks"],
    9: ["full day", "full days"],
  };
  if (p.visitor.rule === 9) return SPECIAL[p.visitor.id] ? `On any full day, ${subject(p.visitor)}` : `On any full day, ${article(name)} ${name} might visit`;
  if (p.visitor.rule === 6) return `A perfect week, Mon to Sun, and ${subject(p.visitor)}`;
  const [one, many] = unit[p.visitor.rule];
  return `${left} ${left === 1 ? one : many} and ${subject(p.visitor)}`;
}

// ---------- garden ----------

/** Who is in the garden on `day`: a visitor arriving that day, else on a full day a seeded pick of those found before. */
export function gardenVisitor(state: AppState, arc: Arc, day: YMD): string | null {
  const found = state.visitors.filter((x) => x.arcId === arc.id && x.foundOn <= day);
  const arriving = found.filter((x) => x.foundOn === day);
  if (arriving.length) return arriving[arriving.length - 1]!.visitorId;
  if (!found.length || !isFull(state, arc, day)) return null;
  const sorted = [...found].sort((a, b) => (a.visitorId < b.visitorId ? -1 : 1));
  return sorted[Math.floor(hash(`${arc.id}|${day}|pick`) * sorted.length)]!.visitorId;
}

// ---------- found records ----------

/**
 * Found visitors of a season, in any arc, counted by the visitor's own season
 * (an arc's season can change later; its records keep theirs and are never lost).
 */
export function foundInSeason(state: AppState, season: Season): VisitorFound[] {
  return state.visitors
    .filter((r) => visitorById(r.visitorId)?.season === season && state.arcs.some((a) => a.id === r.arcId && !a.deleted))
    .sort((a, b) => (a.foundOn < b.foundOn ? -1 : a.foundOn > b.foundOn ? 1 : 0));
}

/** The arc's visitors of its current season, oldest first. */
export function arcFound(state: AppState, arc: Arc): VisitorFound[] {
  return foundInSeason(state, arc.season).filter((r) => r.arcId === arc.id);
}

/** The oldest arrival in this arc that has not made its garden entrance yet. */
export function pendingEntrance(state: AppState, arc: Arc): VisitorFound | null {
  return (
    state.visitors
      .filter((r) => r.arcId === arc.id && !state.ui.celebrated[`visitor:${r.id}`])
      .sort((a, b) => (a.foundOn < b.foundOn ? -1 : a.foundOn > b.foundOn ? 1 : 0))[0] ?? null
  );
}
