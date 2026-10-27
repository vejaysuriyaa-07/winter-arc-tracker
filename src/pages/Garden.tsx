// The Garden tab (SPEC 5.1), laid out as docs/design/Skin.dc.html.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { actions, useAppState } from "../lib/store";
import { useNow, useToday } from "../lib/today";
import { activeArc, chainStrip } from "../lib/stats";
import { gardenFromState, NO_EVENTS } from "../lib/garden";
import { skyEvents } from "../lib/sky";
import { arcFound, gardenVisitor, nextVisitor, pendingEntrance, teaser, visitorById } from "../lib/visitors";
import GardenVisitor from "../components/visitors/GardenVisitor";
import { bloomKey, iconFor, shouldPlayFullBloom, todayView } from "../lib/today-view";
import { parseLocal } from "../lib/dates";
import { feedback } from "../lib/feedback";
import { playSound } from "../lib/sounds";
import GardenScene from "../scenes/GardenScene";
import { flareNightSky } from "../scenes/NightSky";
import { animateIcons } from "../scenes/streakIcons";
import { useMotionAllowed, useSceneLoop } from "../scenes/useSceneLoop";
import { useTheme } from "../theme/ThemeProvider";
import Header, { Wordmark } from "../components/garden/Header";
import MoodRow from "../components/garden/MoodRow";
import HabitList from "../components/garden/HabitList";
import HabitRow from "../components/garden/HabitRow";
import QuickAdd from "../components/garden/QuickAdd";
import { BloomChain, BloomMini, FullBloom } from "../components/garden/Bloom";
import UndoToast, { type ToastData } from "../components/ui/UndoToast";
import { RecapCard } from "./Recap";
import { latestRecap } from "../lib/recap";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });

function DateHeading({ day }: { day: string }) {
  const th = useTheme();
  const d = parseLocal(day);
  return (
    <div className="-mt-1.5 flex flex-col gap-1">
      <h1
        data-testid="weekday"
        className="self-start text-[48px] leading-[1.05] tracking-[-0.01em]"
        style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight, backgroundImage: th.dateInk, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
      >
        {WEEKDAY.format(d)}
      </h1>
      <span data-testid="date" className="text-[15px]" style={{ color: th.t.muted }}>{MONTH_DAY.format(d)}</span>
    </div>
  );
}

function Frame({ children, frameRef }: { children: React.ReactNode; frameRef: React.Ref<HTMLDivElement> }) {
  const th = useTheme();
  return (
    <div ref={frameRef} className="relative flex-none overflow-hidden" style={{ borderRadius: th.frame.radius, border: th.frame.border, boxShadow: th.frame.shadow, scrollMarginTop: 16 }}>
      {children}
    </div>
  );
}

function EmptyGarden() {
  const th = useTheme();
  return (
    <div className="contents">
      <header className="flex h-11 items-center"><Wordmark /></header>
      <div className="card flex flex-col items-start gap-3 p-5">
        <p data-testid="empty-garden" className="text-[17px]">Start your first arc to plant a garden.</p>
        <p className="text-sm" style={{ color: th.t.muted }}>Pick a season and a length, add the habits you want to grow, and each one becomes a plant.</p>
        <Link to="/arcs/new" className="flex h-12 items-center rounded-2xl px-5 font-semibold" style={{ background: th.accentGradient, color: th.t.onAccent }}>
          Start an arc
        </Link>
      </div>
    </div>
  );
}

export default function Garden() {
  const state = useAppState();
  const today = useToday();
  const th = useTheme();
  const arc = activeArc(state);
  const motion = useMotionAllowed();
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [bloomPlaying, setBloomPlaying] = useState(false);

  useSceneLoop(root, (t) => animateIcons(t, motion), motion);

  const now = useNow();
  const view = arc ? todayView(state, arc, today) : null;
  // Who visits today, and whether a new arrival still owes its entrance.
  // Arrivals waiting for their entrance come first, oldest first (a backfill can date one in the past).
  const pending = arc && view && view.phase === "active" ? pendingEntrance(state, arc) : null;
  const visitorId = pending ? pending.visitorId : arc && view && view.phase !== "before" ? gardenVisitor(state, arc, view.day) : null;
  const visitorRecord = pending ?? (arc && visitorId ? state.visitors.find((x) => x.arcId === arc.id && x.visitorId === visitorId) : undefined);
  const entrance = !!pending;
  const shooting = !!pending && visitorById(pending.visitorId)?.rule === 9;
  const events = arc && view && view.phase === "active" ? skyEvents(state, arc, today, now, shooting) : NO_EVENTS;
  const model = useMemo(
    () => (arc && view ? gardenFromState(state, arc, view.day, events, visitorId) : null),
    [state, arc, view?.day, events.night, events.fireflies, events.brightStars, events.aurora, events.rainbow, events.shootingStar, visitorId], // the events object is rebuilt each render; its fields are the real inputs
  );
  const found = arc ? new Set(arcFound(state, arc).map((x) => x.visitorId)) : new Set<string>();
  const next = arc ? nextVisitor(state, arc, today, found) : null;

  // Full bloom: only a live change into a full day plays it, once per day (never on load).
  const fullKey = arc && view ? bloomKey(arc.id, view.day) : "";
  const isFullNow = !!view && view.total > 0 && view.done === view.total && view.phase === "active";
  // Only a check made here can complete the day: removing the last open habit, a sync pull or
  // another tab making today full never plays it (SPEC 5.1: "Checking the last habit").
  const prev = useRef<{ key: string; full: boolean } | null>(null);
  const justChecked = useRef<string | null>(null);
  useEffect(() => {
    if (!fullKey) return;
    const p = prev.current;
    const checkedHere = justChecked.current === fullKey;
    if (checkedHere && p && p.key === fullKey && shouldPlayFullBloom(p.full, isFullNow, fullKey, state.ui.celebrated)) {
      actions.markCelebrated(fullKey);
      feedback("fullBloom", state.settings.haptics);
      playSound("fullBloom", state.settings.sounds);
      if (motion) {
        // The last check happens down in the list: bring the garden card up so the bloom is seen.
        frame.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setBloomPlaying(true);
      }
    }
    prev.current = { key: fullKey, full: isFullNow };
  }, [fullKey, isFullNow, state.ui.celebrated, state.settings.haptics, state.settings.sounds, motion]);
  // A check only counts for the render it caused; runs after the bloom effect on every render.
  useEffect(() => {
    justChecked.current = null;
  });

  const endBloom = useCallback(() => setBloomPlaying(false), []);
  const closeToast = useCallback(() => setToast(null), []);

  // The loop root is always rendered, so it observes the page even if the first mount was empty.
  return (
    <div ref={root} className="flex flex-col gap-[18px]">
      {!arc || !view || !model ? <EmptyGarden /> : renderBody()}
    </div>
  );

  function renderBody() {
  if (!arc || !view || !model) return null;
  const total = view.total;
  return (
    <>
      <Header state={state} arc={arc} today={today} onSwitch={(id) => actions.setActiveArc(id)} />
      <DateHeading day={today} />

      <Frame frameRef={frame}>
        <GardenScene
          model={model}
          onPlant={(id) => navigate(`/plant/${id}`)}
          plantLabel={(id) => `Open ${state.habits.find((h) => h.id === id)?.name ?? "plant"}`}
          visitor={visitorRecord ? <GardenVisitor key={visitorRecord.id} record={visitorRecord} entrance={entrance} motion={motion} /> : undefined}
        />
        {view.phase === "before" && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <span data-testid="starts-in" className="rounded-full px-4 py-1.5 text-[15px] font-medium" style={{ background: "rgba(255, 255, 255, 0.82)", color: "#272520" }}>
              Starts in {view.startsIn} {view.startsIn === 1 ? "day" : "days"}
            </span>
          </div>
        )}
        {bloomPlaying && <FullBloom petals={total} onDone={endBloom} />}
      </Frame>

      {view.phase === "complete" && (
        <p data-testid="arc-finished" className="text-[15px]" style={{ color: th.t.muted }}>
          This arc is finished. Its garden stays as it was on the last day.
        </p>
      )}

      <MoodRow mood={view.mood} season={arc.season} disabled={!view.canCheck} onPick={(m) => actions.setMood(arc.id, today, m)} />

      <section aria-label="Habits" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[26px] leading-none" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>
            {view.phase === "before" ? "Day 1" : "Today"}{" "}
            <span data-testid="count" className="num text-[15px]" style={{ fontFamily: th.t.fonts.body, color: th.t.muted }}>
              {view.done} of {total}
            </span>
          </h2>
          <div className="flex items-center gap-1">
            <BloomMini done={view.done} total={total} />
            {total > 0 && view.phase !== "complete" && (
              <button type="button" onClick={() => setEditing((e) => !e)} className="tap h-10 pr-0.5 pl-3 text-[15px] font-semibold" style={{ color: th.accent }}>
                {editing ? "Done" : "Edit"}
              </button>
            )}
          </div>
        </div>
        <div aria-hidden="true" className="-mt-0.5 h-1 overflow-hidden rounded-full" style={{ background: th.progressTrack }}>
          <div data-testid="progress-line" data-percent={Math.round(view.percent)} className="h-full rounded-full" style={{ width: `${view.percent}%`, background: th.progressFill, transition: "width 500ms cubic-bezier(0.22, 1, 0.36, 1)" }} />
        </div>

        {total === 0 ? (
          <p data-testid="no-habits" className="py-2 text-[15px]" style={{ color: th.t.muted }}>Add your first habit below. It will grow into a plant.</p>
        ) : (
          <HabitList
            rows={view.rows}
            editing={editing}
            onReorder={(ids) => actions.reorderHabits(arc.id, ids)}
            render={(r, i, last, dragStart) => (
              <HabitRow
                habit={r.habit}
                done={r.done}
                streak={r.streak}
                icon={iconFor(r.streak, view.mood, arc.season)}
                index={i}
                last={last}
                editing={editing && view.phase !== "complete"}
                disabled={!view.canCheck}
                motion={motion}
                onToggle={() => {
                  if (!r.done) {
                    justChecked.current = bloomKey(arc.id, today);
                    flareNightSky();
                    feedback("check", state.settings.haptics);
                    playSound("check", state.settings.sounds);
                  }
                  actions.toggleHabit(arc.id, today, r.habit.id);
                }}
                onRemove={() => {
                  actions.removeHabit(today, r.habit.id);
                  feedback("remove", state.settings.haptics);
                  setToast({ id: Date.now(), text: `${r.habit.name} removed. Its tree stops growing.`, onUndo: () => actions.restoreHabit(today, r.habit.id) });
                }}
                {...(dragStart ? { onDragStart: dragStart } : {})}
              />
            )}
          />
        )}
        {view.phase !== "complete" && <QuickAdd onAdd={(name) => actions.addHabit(today, arc.id, { name })} />}
      </section>

      {(() => {
        const wk = latestRecap(state, arc, now);
        return wk ? <RecapCard arc={arc} monday={wk} /> : null;
      })()}
      {view.phase !== "before" && (
        <BloomChain days={chainStrip(state, arc, today)} chain={view.chain} teaser={next ? teaser(next) : "Every visitor has found your garden this arc."} />
      )}
      <UndoToast toast={toast} onDone={closeToast} />
    </>
  );
  }
}
