// Progress (SPEC 5.2, 5.3): this arc and all time.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { AppState, Arc } from "../types";
import { actions, useAppState } from "../lib/store";
import { useToday } from "../lib/today";
import { activeArc, arcEnd, lifetimeCounts, weakestWeekday, weekBars } from "../lib/stats";
import { fullGrowthDays, gardenFromState, NO_EVENTS } from "../lib/garden";
import { arcStatus } from "../lib/arcs";
import { formatMonthDay, minDay } from "../lib/dates";
import { arcTiles, bestMonthLine, firstMonthLabel, MONTH_NAMES, plantsRanked, tallestTrees, timelapseDay, timelapseRange, treeRings, weekLine } from "../lib/progress";
import GardenScene from "../scenes/GardenScene";
import Header from "../components/garden/Header";
import { Bar, MiniPlant, RowLink, SectionTitle, Segmented, Tile } from "../components/progress/Bits";
import { ThemeScope, useTheme } from "../theme/ThemeProvider";
import { LOOK_TOKENS } from "../theme/tokens";

type View = "arc" | "all";
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

function Timelapse({ state, arc, today }: { state: AppState; arc: Arc; today: string }) {
  const th = useTheme();
  const { last } = timelapseRange(arc, today);
  const [day, setDay] = useState(last);
  const [playing, setPlaying] = useState(false);
  useEffect(() => setDay(last), [last]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setDay((d) => {
        if (d >= last) {
          setPlaying(false);
          return last;
        }
        return d + 1;
      });
    }, 120);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, last]);
  const date = timelapseDay(arc, day);
  const model = useMemo(() => gardenFromState(state, arc, date, NO_EVENTS), [state, arc, date]);
  return (
    <section aria-label="Garden timelapse" className="flex flex-col gap-3">
      <div className="overflow-hidden" style={{ borderRadius: th.frame.radius, border: th.frame.border, boxShadow: th.frame.shadow }}>
        <GardenScene model={model} testId="timelapse" label={`Your garden on day ${day}`} />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play timelapse"}
          data-testid="timelapse-play"
          onClick={() => {
            if (!playing && day >= last) setDay(1);
            setPlaying((p) => !p);
          }}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
          style={{ background: th.accentGradient, color: th.t.onAccent }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{playing ? <path d="M7 5H10V19H7ZM14 5H17V19H14Z" /> : <path d="M8 5L19 12L8 19Z" />}</svg>
        </button>
        <input
          type="range"
          aria-label="Day"
          data-testid="timelapse-slider"
          min={1}
          max={last}
          value={day}
          onChange={(e) => {
            setPlaying(false);
            setDay(Number(e.target.value));
          }}
          className="h-11 min-w-0 flex-1"
          style={{ accentColor: th.accent }}
        />
        <span data-testid="timelapse-label" className="num w-16 text-right text-[14px]" style={{ color: th.t.muted }}>{day === last && date === today ? "Today" : formatMonthDay(date)}</span>
      </div>
    </section>
  );
}

function ThisArc({ state, arc, today }: { state: AppState; arc: Arc; today: string }) {
  const th = useTheme();
  const tiles = arcTiles(state, arc, today);
  const plants = plantsRanked(state, arc, today);
  const bars = weekBars(state, arc, today);
  const weak = weakestWeekday(bars);
  const line = weekLine(state, arc, today);
  const found = state.visitors.filter((v) => v.arcId === arc.id).length;
  const started = tiles.daysSoFar > 0;
  return (
    <div className="flex flex-col gap-[18px]">
      {started ? <Timelapse key={arc.id} state={state} arc={arc} today={today} /> : <p className="text-[15px]" style={{ color: th.t.muted }}>{arcStatus(state, arc, today).label}. Your progress starts on day 1.</p>}
      <div className="grid grid-cols-2 gap-2.5">
        <Tile label="Days kept" value={String(tiles.kept)} unit={`of ${tiles.daysSoFar}`} testId="tile-kept" />
        <Tile label="Arc score" value={tiles.score === null ? "–" : `${Math.round(tiles.score)}%`} testId="tile-score" />
        <Tile label="Current streak" value={String(tiles.chain)} unit={tiles.chain === 1 ? "day" : "days"} testId="tile-chain" />
        <Tile label="Best streak" value={String(tiles.bestChain)} unit={tiles.bestChain === 1 ? "day" : "days"} testId="tile-best" />
      </div>
      <RowLink to="/month" title="Month view" detail="Every day, and backfill a missed check" testId="month-link" />

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Your plants, tallest first</SectionTitle>
        {plants.length === 0 ? (
          <p className="text-[15px]" style={{ color: th.t.muted }}>Add a habit on the Garden tab to plant your first tree.</p>
        ) : (
          <ul className="card flex flex-col px-3">
            {plants.map((r, i) => (
              <li key={r.habit.id} style={{ borderBottom: i === plants.length - 1 ? "none" : `1px solid ${th.t.line}` }}>
                <Link to={`/plant/${r.habit.id}`} data-testid="plant-row" className="flex min-h-14 items-center gap-3 py-2">
                  <span className="flex h-10 w-10 flex-none items-end justify-center"><MiniPlant g={r.g} wilt={r.archived} season={arc.season} /></span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex justify-between gap-2">
                      <span className="truncate font-medium" style={{ opacity: r.archived ? 0.6 : 1 }}>{r.habit.name}</span>
                      <span className="num text-[13px]" style={{ color: th.t.muted }} data-testid="plant-days">{r.daysDone} of {r.daysScheduled} days</span>
                    </span>
                    <Bar value={r.rate === null ? 0 : r.rate / 100} strong={(r.rate ?? 0) >= 50} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Your week</SectionTitle>
        <div className="card flex flex-col gap-3 p-4">
          <div className="flex h-[96px] items-end justify-between gap-2" role="img" aria-label="Completion by weekday, Monday to Sunday">
            {bars.map((b, i) => (
              <span key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span data-testid="week-bar" data-weak={i === weak ? "true" : "false"} className="w-full rounded-md" style={{ height: Math.max(3, (b ?? 0) * 0.75), background: i === weak ? th.accent : th.isNight ? "#3A4235" : th.t.line }} />
                <span className="text-[11px]" style={{ color: th.t.muted }}>{WEEK[i]}</span>
              </span>
            ))}
          </div>
          {line && <p data-testid="week-line" className="text-[15px]" style={{ fontFamily: th.t.fonts.display, fontStyle: "italic" }}>{line}</p>}
        </div>
      </section>

      <RowLink to="/visitors" title="Visitors" detail={`${found} of 9 found`} testId="visitors-link" />
    </div>
  );
}

function Rings({ state, today }: { state: AppState; today: string }) {
  const th = useTheme();
  const rings = useMemo(() => treeRings(state, today, 126), [state, today]);
  const [picked, setPicked] = useState<number | null>(null);
  const colorFor = (arcId: string | null): string => {
    const arc = state.arcs.find((a) => a.id === arcId);
    if (!arc) return th.isNight ? "#3A4235" : "#C9C2B2";
    return LOOK_TOKENS[th.look].accents[arc.season];
  };
  const p = picked === null ? null : rings[picked];
  const outer = rings.at(-1)?.outer ?? 9;
  return (
    <div className="card flex flex-col items-center gap-3 p-4">
      <svg data-testid="rings" width="280" height="280" viewBox="0 0 280 280" role="img" aria-label={`${rings.length} tree rings, one per month`}>
        <circle cx="140" cy="140" r={outer + 4} fill="none" stroke="#5B4636" strokeWidth="4" />
        {[...rings].reverse().map((r) => {
          const i = rings.indexOf(r);
          const mid = (r.inner + r.outer) / 2;
          return (
            <ellipse
              key={`${r.year}-${r.month}`}
              data-testid="ring"
              cx="140" cy="140" rx={mid + r.wx / 2} ry={mid + r.wy / 2}
              fill="none"
              stroke={colorFor(r.arcId)}
              strokeOpacity={r.arcId ? 0.35 + 0.65 * (r.rate ?? 0) : 0.6}
              strokeWidth={Math.max(1.5, r.outer - r.inner)}
              onClick={() => setPicked(i)}
              style={{ cursor: "pointer" }}
            />
          );
        })}
        <circle cx="140" cy="140" r="8" fill="#8A6A52" />
      </svg>
      {/* Tap targets for the rings: one 44px button per month, in order, for touch and keyboard. */}
      <div className="flex max-w-full flex-wrap justify-center gap-1.5">
        {rings.map((r, i) => (
          <button key={`${r.year}-${r.month}`} type="button" data-testid="ring-button" aria-pressed={picked === i} onClick={() => setPicked(i)} className="tap rounded-full px-2 text-[12px]" style={{ background: picked === i ? th.accentGradient : "transparent", color: picked === i ? th.t.onAccent : th.t.muted, boxShadow: `0 0 0 1px ${th.t.line}` }}>
            {MONTH_NAMES[r.month - 1]!.slice(0, 3)}
          </button>
        ))}
      </div>
      <p data-testid="ring-detail" className="text-[15px]">
        {p ? `${MONTH_NAMES[p.month - 1]} ${p.year}: ${p.arcId === null ? "no arc running" : p.rate === null ? "nothing scheduled" : `${Math.round(p.rate * 100)}% of days kept`}` : "Tap a month to see how it went."}
      </p>
    </div>
  );
}

function AllTime({ state, today }: { state: AppState; today: string }) {
  const th = useTheme();
  const navigate = useNavigate();
  const { life, tall, best } = useMemo(
    () => ({ life: lifetimeCounts(state, today, fullGrowthDays), tall: tallestTrees(state, today, 5), best: bestMonthLine(state, today) }),
    [state, today],
  );
  const arcs = state.arcs.filter((a) => !a.deleted).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const counts: [string, number, string][] = [
    ["Trees grown to full size", life.fullGrownTrees, "life-trees"],
    ["Flowers, one per kept day", life.flowers, "life-flowers"],
    ["Longest streak, in days", life.longestStreak, "life-streak"],
    ["Arcs finished", life.arcsFinished, "life-arcs"],
    ["Habits checked off", life.checkoffs, "life-checkoffs"],
    ["Days tended", life.daysTended, "life-days"],
  ];
  return (
    <div className="flex flex-col gap-[18px]">
      <section className="flex flex-col gap-2.5">
        <SectionTitle aside="One per month">Your rings</SectionTitle>
        <Rings state={state} today={today} />
        <p className="text-[14px]" style={{ color: th.t.muted }}>Thicker rings mean more days kept.{best ? ` ${best}` : ""}</p>
      </section>
      <div className="grid grid-cols-3 gap-2">
        {counts.map(([label, v, id]) => (
          <div key={id} className="card flex flex-col gap-1 p-3">
            <span className="num text-[24px] leading-none" data-testid={id} style={{ fontFamily: th.t.fonts.display }}>{v}</span>
            <span className="text-[12px] leading-snug" style={{ color: th.t.muted }}>{label}</span>
          </div>
        ))}
      </div>
      <section className="flex flex-col gap-2.5">
        <SectionTitle>Your grove</SectionTitle>
        <p className="-mt-1.5 text-[14px]" style={{ color: th.t.muted }}>Every arc you've grown</p>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1" data-testid="grove">
          {arcs.map((a) => {
            const day = minDay(today, arcEnd(a));
            const model = gardenFromState(state, a, day < a.startDate ? a.startDate : day, NO_EVENTS);
            return (
              <ThemeScope key={a.id} look={a.look} season={a.season} className="flex-none">
                <button type="button" data-testid="grove-plot" onClick={() => { actions.setActiveArc(a.id); navigate("/"); }} className="flex w-[168px] flex-col gap-1.5 text-left">
                  <span className="block overflow-hidden" style={{ borderRadius: 14 }}><GardenScene model={model} still testId="garden-mini" label={`${a.name} garden`} /></span>
                  <span className="truncate text-[14px] font-medium">{a.name}</span>
                  <span className="text-[12px]" style={{ color: LOOK_TOKENS[a.look].muted }}>{arcStatus(state, a, today).label}</span>
                </button>
              </ThemeScope>
            );
          })}
        </div>
      </section>
      <section className="flex flex-col gap-2.5">
        <SectionTitle>Tallest trees</SectionTitle>
        {tall.length === 0 ? (
          <p className="text-[15px]" style={{ color: th.t.muted }}>Check off a habit and its tree starts to grow.</p>
        ) : (
          <ol className="card flex flex-col px-4">
            {tall.map((t, i) => (
              <li key={t.name} data-testid="tall-tree" className="flex min-h-12 items-center justify-between" style={{ borderBottom: i === tall.length - 1 ? "none" : `1px solid ${th.t.line}` }}>
                <span className="font-medium">{t.name}</span>
                <span className="num text-[14px]" style={{ color: th.t.muted }}>{t.daysDone} {t.daysDone === 1 ? "day" : "days"}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export default function Progress() {
  const state = useAppState();
  const today = useToday();
  const th = useTheme();
  const arc = activeArc(state);
  const [q, setQ] = useSearchParams();
  const view: View = q.get("view") === "all" ? "all" : "arc";
  const since = firstMonthLabel(state);
  if (!arc) {
    return (
      <div className="flex flex-col gap-[18px]">
        <header className="flex h-11 items-center"><h1 className="text-[30px] leading-none" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Progress</h1></header>
        <p data-testid="no-progress" className="text-[15px]" style={{ color: th.t.muted }}>Start an arc to see your progress here.</p>
        <Link to="/arcs/new" className="flex h-12 items-center justify-center rounded-2xl font-semibold" style={{ background: th.accentGradient, color: th.t.onAccent }}>Start an arc</Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[18px]">
      <Header state={state} arc={arc} today={today} onSwitch={(id) => actions.setActiveArc(id)} title="Progress" />
      {since && <p className="-mt-3 text-[14px]" style={{ color: th.t.muted }}>Growing since {since}</p>}
      <Segmented label="Progress view" value={view} onChange={(v) => setQ(v === "all" ? { view: "all" } : {}, { replace: true })} options={[{ value: "arc", label: "This arc" }, { value: "all", label: "All time" }]} />
      {view === "arc" ? <ThisArc state={state} arc={arc} today={today} /> : <AllTime state={state} today={today} />}
    </div>
  );
}
