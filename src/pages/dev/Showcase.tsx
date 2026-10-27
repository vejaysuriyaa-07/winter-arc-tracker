// Screenshot target for the theme system and the scene engine. Compiled in only
// when VITE_SHOWCASE=1 (the e2e build); never part of the shipped app. The sample
// plants mirror the props of docs/design/Garden.dc.html so screenshots compare 1:1.
import { useSearchParams } from "react-router";
import { LOOKS, MOODS, SEASONS, type Look, type Mood, type Season } from "../../types";
import { NO_EVENTS, sceneModel, type SkyEvents } from "../../lib/garden";
import GardenScene from "../../scenes/GardenScene";
import NightSky from "../../scenes/NightSky";
import { ThemeScope, useTheme } from "../../theme/ThemeProvider";
import VisitorArt from "../../components/visitors/VisitorArt";
import { VISITORS } from "../../lib/visitors";
import { SCENE_PALETTES } from "../../lib/garden";

const RATES = [0.9, 0.75, 0.35, 0.95, 0.6, 0.85, 0.45, 0.8, 0.55];
const LABELS = ["Wake up at 5 AM", "Meditation", "Gym"];

function pick<T extends string>(v: string | null, all: readonly T[], d: T): T {
  return (all as readonly string[]).includes(v ?? "") ? (v as T) : d;
}

function eventsFor(name: string | null): SkyEvents {
  switch (name) {
    case "night": return { ...NO_EVENTS, night: true };
    case "fireflies": return { ...NO_EVENTS, night: true, fireflies: true };
    case "bright": return { ...NO_EVENTS, night: true, brightStars: true };
    case "aurora": return { ...NO_EVENTS, night: true, aurora: true, brightStars: true };
    case "rainbow": return { ...NO_EVENTS, rainbow: true };
    case "shooting": return { ...NO_EVENTS, night: true, shootingStar: true };
    default: return NO_EVENTS;
  }
}

function Chrome({ mood, day, done, events }: { mood: Mood; day: number; done: number; events: SkyEvents }) {
  const th = useTheme();
  const total = 9;
  const model = sceneModel({
    season: th.season,
    mood,
    events,
    lengthDays: 90,
    dayNumber: day,
    plants: RATES.map((r, i) => ({ id: `p${i}`, daysDone: Math.round((day - 1) * r) + (i < done ? 1 : 0), wilt: false })),
    keptDays: Array.from({ length: Math.round((day - 1) * 0.8) }, (_, i) => ({ full: i % 3 === 0 })),
    bloom: done >= total,
  });
  return (
    <>
      {th.isNight && <NightSky accent={th.accent} progress={done / total} />}
      <div className="relative z-10 flex flex-col gap-[18px] px-4 pt-4 pb-10">
        <header className="flex h-11 items-center justify-between">
          <span style={{ fontFamily: th.t.fonts.display, fontStyle: th.t.fonts.wordmarkStyle, fontWeight: th.t.fonts.wordmarkWeight, fontSize: th.t.fonts.wordmarkSize }}>
            {th.t.fonts.wordmark}
          </span>
          <span className="flex h-10 items-center rounded-full text-[15px] font-medium" style={{ padding: `0 ${th.chip.padX}px`, background: th.chip.background, border: th.chip.border }}>
            Winter Arc
          </span>
        </header>
        <div className="-mt-1.5 flex flex-col gap-1">
          <h1 className="self-start text-[48px] leading-[1.05]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight, backgroundImage: th.dateInk, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            Monday
          </h1>
          <span className="text-[15px]" style={{ color: th.t.muted }}>October 26</span>
        </div>
        <div style={{ borderRadius: th.frame.radius, border: th.frame.border, boxShadow: th.frame.shadow, overflow: "hidden" }}>
          <GardenScene model={model} />
        </div>
        <div className="grid grid-cols-5" style={{ gap: th.moodWrap.gap, padding: th.moodWrap.pad, borderRadius: th.moodWrap.radius, background: th.moodWrap.background, boxShadow: th.moodWrap.shadow }}>
          {MOODS.map((m) => {
            const s = th.moodButton(m === mood);
            return <span key={m} className="h-12" style={{ borderRadius: s.radius, border: s.border, background: s.background, boxShadow: s.shadow }} />;
          })}
        </div>
        <div className="flex flex-col" style={{ gap: th.listWrap.gap, background: th.listWrap.background, borderRadius: th.listWrap.radius, borderTop: th.listWrap.borderTop, boxShadow: th.listWrap.shadow }}>
          {LABELS.map((label, i) => {
            const d = i < 2;
            const r = th.row(d, i === LABELS.length - 1);
            return (
              <div key={label} className="flex min-h-14 items-center gap-3" style={{ padding: `6px ${th.listWrap.padR}px 6px ${th.listWrap.padL}px`, background: r.background, boxShadow: r.shadow, borderRadius: r.radius, borderBottom: r.divider }}>
                <span className="h-6 w-6 rounded-full" style={{ border: `1.5px solid ${th.checkRing(d)}`, background: th.checkFill(d) }} />
                <span className="font-medium">{label}</span>
              </div>
            );
          })}
        </div>
        <span data-testid="scope-probe" className="text-muted font-display border-b border-line">Scoped utilities</span>
        <span className="flex h-12 items-center justify-center rounded-2xl font-semibold" style={{ background: th.accentGradient, color: th.t.onAccent }}>
          Plant this arc
        </span>
      </div>
    </>
  );
}

function Sheet() {
  return (
    <div data-testid="visitor-sheet" className="flex flex-col gap-3 bg-[#F8F4EB] p-3">
      {SEASONS.map((s) => (
        <div key={s} className="grid grid-cols-5 gap-2">
          {VISITORS[s].map((v) => (
            <div key={v.id} className="flex flex-col items-center gap-1">
              <span className="flex h-[66px] w-[66px] items-center justify-center rounded-xl" style={{ background: `linear-gradient(180deg, ${SCENE_PALETTES[s].sky.good[0]} 0%, ${SCENE_PALETTES[s].sky.good[1]} 100%)` }}>
                <VisitorArt id={v.id} size={58} />
              </span>
              <span className="text-[10px] text-[#272520]">{v.name}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Showcase() {
  const [q] = useSearchParams();
  if (q.get("view") === "visitors") return <Sheet />;
  const look: Look = pick(q.get("look"), LOOKS, "journal");
  const season: Season = pick(q.get("season"), SEASONS, "winter");
  const mood: Mood = pick(q.get("mood"), MOODS, "good");
  const day = Math.max(1, Math.min(90, Number(q.get("day") ?? 40) || 40));
  const done = Math.max(0, Math.min(9, Number(q.get("done") ?? 5)));
  return (
    <ThemeScope look={look} season={season} paint className="relative min-h-dvh" data-testid="showcase">
      <Chrome mood={mood} day={day} done={done} events={eventsFor(q.get("event"))} />
    </ThemeScope>
  );
}
