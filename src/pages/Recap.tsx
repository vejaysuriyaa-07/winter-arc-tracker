// The Sunday recap (SPEC 5.9, Recap.dc.html): a tap-through story of four slides
// (the visitors slide is skipped when nobody new came), in the arc's look and season.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { actions, useAppState } from "../lib/store";
import { useNow, useToday } from "../lib/today";
import { activeArc } from "../lib/stats";
import { recapKey, recapModel, recapWeeks, type RecapModel } from "../lib/recap";
import { gardenFromState, NO_EVENTS } from "../lib/garden";
import { formatMonthDay, parseLocal } from "../lib/dates";
import { arrivalLine, visitorById } from "../lib/visitors";
import { prepareImage, shareBlob } from "../lib/share";
import GardenScene from "../scenes/GardenScene";
import VisitorArt from "../components/visitors/VisitorArt";
import { ThemeScope, useTheme } from "../theme/ThemeProvider";
import { GOLD, rgba } from "../theme/tokens";
import type { Arc, AppState } from "../types";

const pct = (v: number | null): string => (v === null ? "–" : `${Math.round(v)}%`);
const DAYNAME = new Intl.DateTimeFormat("en-US", { weekday: "long" });

function Title({ children }: { children: React.ReactNode }) {
  const th = useTheme();
  return <h2 className="text-[30px] leading-tight" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>{children}</h2>;
}

function ScoreSlide({ m }: { m: RecapModel }) {
  const th = useTheme();
  const diff = m.score !== null && m.previousScore !== null ? m.score - m.previousScore : null;
  const lines: string[] = [];
  if (diff !== null) lines.push(diff >= 0 ? `Up from ${pct(m.previousScore)} the week before.` : `Down from ${pct(m.previousScore)} the week before.`);
  lines.push(`${m.fullBlooms} full ${m.fullBlooms === 1 ? "bloom" : "blooms"}${m.missedDays === 0 ? " and not a single day missed." : `, ${m.missedDays} ${m.missedDays === 1 ? "day" : "days"} missed.`}`);
  return (
    <div className="flex flex-col gap-5">
      <Title>Your week in the garden</Title>
      <span data-testid="recap-score" className="num leading-none" style={{ fontFamily: th.t.fonts.display, fontSize: 132, backgroundImage: th.dateInk, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{pct(m.score)}</span>
      {m.bestWeek && <span data-testid="best-week" className="self-start rounded-full px-3 py-1 text-[14px] font-semibold" style={{ background: rgba(GOLD, 0.2), color: th.isNight ? GOLD : "#7A5208" }}>Your best week yet</span>}
      <p className="text-[18px] leading-snug">{lines.join(" ")}</p>
    </div>
  );
}

function GrewSlide({ m, state, arc }: { m: RecapModel; state: AppState; arc: Arc }) {
  const th = useTheme();
  const before = gardenFromState(state, arc, addDaysSafe(m.monday, -1, arc.startDate), NO_EVENTS); // last Sunday, or day 1
  const after = gardenFromState(state, arc, m.sunday, NO_EVENTS);
  const lines = [
    m.plantsGrew > 0 ? `${m.plantsGrew} ${m.plantsGrew === 1 ? "plant" : "plants"} grew a size` : "Your plants held their ground",
    `${m.newFlowers} new ${m.newFlowers === 1 ? "flower" : "flowers"} on the hill`,
    ...(m.birdsAfter > m.birdsBefore ? [m.birdsBefore === 0 ? "The first bird started visiting" : "Another bird started visiting"] : []),
  ];
  return (
    <div className="flex flex-col gap-5">
      <Title>Your garden grew</Title>
      <div className="grid grid-cols-2 gap-3">
        {[["Last Sunday", before], ["This Sunday", after]].map(([label, model]) => (
          <figure key={label as string} className="flex flex-col gap-1.5">
            <span className="block overflow-hidden" style={{ borderRadius: 16, boxShadow: th.frame.shadow }}>
              <GardenScene model={model as ReturnType<typeof gardenFromState>} still testId="garden-mini" label={label as string} />
            </span>
            <figcaption className="text-[13px]" style={{ color: th.t.muted }}>{label as string}</figcaption>
          </figure>
        ))}
      </div>
      <ul className="flex flex-col gap-2 text-[18px]">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </div>
  );
}

function addDaysSafe(day: string, n: number, floor: string): string {
  const d = parseLocal(day);
  d.setDate(d.getDate() + n);
  const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return s < floor ? floor : s;
}

function VisitorSlide({ m }: { m: RecapModel }) {
  const th = useTheme();
  const v = m.visitors[m.visitors.length - 1]!;
  const info = visitorById(v.visitorId);
  const others = m.visitors.length - 1;
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Title>{m.visitors.length > 1 ? "New visitors" : "New visitor"}</Title>
      <span className="flex h-[200px] w-[200px] items-center justify-center rounded-3xl" style={{ background: rgba(th.accent, 0.12) }}>
        <VisitorArt id={v.visitorId} size={160} />
      </span>
      <p className="text-[22px]" style={{ fontFamily: th.t.fonts.display }}>{info ? arrivalLine(info) : "A visitor moved in"}</p>
      <p className="text-[16px]" style={{ color: th.t.muted }}>
        It showed up on {DAYNAME.format(parseLocal(v.foundOn))}.{others > 0 ? ` And ${others} more came this week.` : ""}
      </p>
    </div>
  );
}

function HighlightsSlide({ m }: { m: RecapModel }) {
  const th = useTheme();
  const h = m.highlights;
  const cards: [string, string][] = [];
  if (h.neverMissed) cards.push(["Never missed", `${h.neverMissed.name}, ${h.neverMissed.done} of ${h.neverMissed.of} days`]);
  if (h.mostImproved) cards.push(["Most improved", `${h.mostImproved.name}, from ${h.mostImproved.from} to ${h.mostImproved.to} days`]);
  if (h.needsLove) cards.push(["Needs some love", `${h.needsLove.day}, at ${Math.round(h.needsLove.percent)}%`]);
  if (h.comingUp) cards.push(["Coming up", h.comingUp]);
  return (
    <div className="flex flex-col gap-4">
      <Title>Highlights</Title>
      {cards.map(([k, v]) => (
        <div key={k} data-testid="highlight" className="card flex flex-col gap-1 p-4">
          <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: th.t.muted }}>{k}</span>
          <span className="text-[18px]">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Story({ arc, monday }: { arc: Arc; monday: string }) {
  const th = useTheme();
  const state = useAppState();
  const today = useToday();
  const navigate = useNavigate();
  const m = useMemo(() => recapModel(state, arc, monday, today), [state, arc, monday, today]);
  const slides = ["score", "grew", ...(m.visitors.length ? ["visitor"] : []), "highlights"] as const;
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  // Make the slide's image as soon as it shows, so Share runs straight inside the tap.
  const image = useRef<Promise<Blob | null> | null>(null);
  useEffect(() => {
    image.current = null;
    let alive = true;
    const t = setTimeout(() => {
      if (!alive || !card.current) return;
      image.current = document.fonts.ready.then(() => (card.current ? prepareImage(card.current, th.t.base[0]) : null));
    }, 400); // after the slide has settled
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [i, th.t.base]);
  useEffect(() => actions.markRecapSeen(recapKey(arc.id, monday)), [arc.id, monday]);
  const last = i === slides.length - 1;
  const go = (d: number): void => setI((x) => Math.max(0, Math.min(slides.length - 1, x + d)));
  const close = (): void => {
    void navigate("/");
  };
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
      <div className="flex gap-1.5" aria-hidden="true">
        {slides.map((s, k) => (
          <span key={s} data-testid="recap-seg" className="h-[3px] flex-1 rounded-full" style={{ background: k <= i ? th.accent : rgba(th.t.text, 0.15) }} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[14px]" style={{ color: th.t.muted }}>Week {m.weekNumber}, {arc.name}</span>
        <button type="button" aria-label="Close recap" onClick={close} className="tap flex items-center justify-center" style={{ color: th.t.muted }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="relative flex-1">
        <p className="sr-only" aria-live="polite">Slide {i + 1} of {slides.length}</p>
        <div ref={card} data-testid="recap-slide" data-slide={slides[i]} className="h-full px-1 py-6" style={{ backgroundImage: th.pageBackground(0) }}>
          {slides[i] === "score" && <ScoreSlide m={m} />}
          {slides[i] === "grew" && <GrewSlide m={m} state={state} arc={arc} />}
          {slides[i] === "visitor" && <VisitorSlide m={m} />}
          {slides[i] === "highlights" && <HighlightsSlide m={m} />}
        </div>
        {/* Tap zones: left 35% back, right 65% forward (Recap.dc.html). */}
        <button type="button" aria-label="Previous slide" data-testid="recap-prev" disabled={i === 0} onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-[35%]" />
        <button type="button" aria-label="Next slide" data-testid="recap-next-zone" onClick={() => go(1)} className="absolute inset-y-0 right-0 w-[65%]" />
      </div>
      {shareNote && <p role="status" className="pb-2 text-center text-[13px]" style={{ color: th.t.muted }}>{shareNote}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          data-testid="recap-share"
          onClick={async () => {
            if (!card.current) return;
            const blob = await (image.current ?? prepareImage(card.current, th.t.base[0]));
            if (!blob) {
              setShareNote("Could not make the image. Try again.");
              return;
            }
            const r = await shareBlob(blob, `grove-week-${m.weekNumber}.png`, `${arc.name}, week ${m.weekNumber}`);
            setShareNote(r === "downloaded" ? "Saved the image." : null);
          }}
          className="h-12 flex-1 rounded-2xl text-[16px] font-semibold"
          style={{ boxShadow: `0 0 0 1px ${th.t.line}`, background: th.isNight ? "#1A1E17" : th.t.surface }}
        >
          Share
        </button>
        <button type="button" data-testid="recap-next" onClick={() => { if (last) void close(); else go(1); }} className="h-12 w-[110px] rounded-2xl text-[16px] font-semibold" style={{ background: th.accentGradient, color: th.t.onAccent }}>
          {last ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}

export default function Recap() {
  const { week } = useParams();
  const state = useAppState();
  const now = useNow();
  const th = useTheme();
  const arc = activeArc(state);
  const ok = arc && week && recapWeeks(state, arc, now).includes(week);
  if (!arc || !ok) {
    return <p className="px-4 pt-6 text-[15px]" style={{ color: th.t.muted }}>This week's recap is not ready yet. It opens on Sunday from 6pm.</p>;
  }
  return (
    <ThemeScope look={th.look} season={arc.season} paint className="min-h-dvh" data-testid="recap">
      <Story arc={arc} monday={week} />
    </ThemeScope>
  );
}

export function RecapCard({ arc, monday }: { arc: Arc; monday: string }) {
  const th = useTheme();
  const navigate = useNavigate();
  return (
    <button type="button" data-testid="recap-card" onClick={() => navigate(`/recap/${monday}`)} className="card flex min-h-[64px] items-center justify-between gap-3 px-4 text-left" style={{ boxShadow: `0 0 0 1.5px ${rgba(GOLD, 0.7)}` }}>
      <span className="flex flex-col">
        <span className="text-[17px]" style={{ fontFamily: th.t.fonts.display }}>Your week in the garden is ready</span>
        <span className="text-[13px]" style={{ color: th.t.muted }}>{arc.name}, {formatMonthDay(monday)} to {formatMonthDay(addDaysSafe(monday, 6, monday))}</span>
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={th.t.muted} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 6L15 12L9 18" /></svg>
    </button>
  );
}
