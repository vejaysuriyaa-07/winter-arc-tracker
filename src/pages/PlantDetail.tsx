// Plant detail (SPEC 5.4, PlantDetail.dc.html): one habit's tree up close.
import { useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { actions, useAppState } from "../lib/store";
import { useToday } from "../lib/today";
import { arcPhase, habitBestStreak, habitRate, habitStreak } from "../lib/stats";
import { canRestore } from "../lib/mutations";
import { growth, SCENE_PALETTES } from "../lib/garden";
import { habitAcrossArcs, plantDays } from "../lib/progress";
import { formatMonthDay } from "../lib/dates";
import { feedback } from "../lib/feedback";
import { useMotionAllowed, useSceneLoop } from "../scenes/useSceneLoop";
import { Bar, MiniPlant, SectionTitle, Tile } from "../components/progress/Bits";
import Sheet from "../components/ui/Sheet";
import { useTheme } from "../theme/ThemeProvider";
import { MISS, rgba } from "../theme/tokens";

function BigTree({ g, wilt, season }: { g: number; wilt: boolean; season: keyof typeof SCENE_PALETTES }) {
  const th = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const tree = useRef<HTMLDivElement>(null);
  const motion = useMotionAllowed();
  const pal = SCENE_PALETTES[season];
  // Sway from PlantDetail.dc.html.
  useSceneLoop(
    box,
    (t) => {
      if (!tree.current) return;
      const gust = Math.pow(Math.max(0, Math.sin(t * 0.42) * Math.sin(t * 0.17 + 1)), 1.5) * 2.2;
      const deg = Math.sin(t * 1.4) * (1 + 1.6 * gust) * (wilt ? 0.35 : 1) + Math.sin(t * 9) * 0.35 * gust * (wilt ? 0 : 1);
      tree.current.style.transform = `rotate(${(deg + (wilt ? 9 : 0)).toFixed(2)}deg)`;
    },
    motion,
  );
  return (
    <div ref={box} data-testid="big-tree" className="relative h-60 overflow-hidden" style={{ borderRadius: th.frame.radius, border: th.frame.border, boxShadow: th.frame.shadow, background: `linear-gradient(180deg, ${pal.sky.good[0]} 0%, ${pal.sky.good[1]} 100%)` }}>
      <svg aria-hidden="true" className="absolute inset-x-0 bottom-0" width="100%" height="70" viewBox="0 0 358 70" preserveAspectRatio="none">
        <path d="M0 22C80 4 180 18 260 8C300 3 340 12 358 6L358 70L0 70Z" fill={pal.ground1} />
      </svg>
      <div className="absolute bottom-6 left-1/2 -ml-[60px] h-[160px] w-[120px]" style={{ transformOrigin: "50% 100%" }}>
        <div ref={tree} style={{ transformOrigin: "50% 98%" }}>
          <MiniPlant g={Math.max(g, 0.03)} wilt={false} season={season} size={160} />
        </div>
      </div>
      {wilt && <span className="absolute top-3 left-3 rounded-full px-3 py-1 text-[13px]" style={{ background: rgba("#FFFFFF", 0.85), color: "#272520" }}>Removed from this arc</span>}
    </div>
  );
}

function EditHabit({ id, name, detail, onClose }: { id: string; name: string; detail: string; onClose: () => void }) {
  const th = useTheme();
  const [n, setN] = useState(name);
  const [d, setD] = useState(detail);
  const field = { padding: `0 ${th.input.padX}px`, borderBottom: th.input.underline, borderRadius: th.input.radius, background: th.input.background, color: th.t.text };
  return (
    <Sheet title="Edit habit" onClose={onClose} testId="edit-habit">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!n.trim()) return;
          actions.editHabit(id, { name: n, detail: d });
          onClose();
        }}
      >
        <label className="flex flex-col gap-1.5 text-[14px]" style={{ color: th.t.muted }}>
          Name
          <input aria-label="Habit name" value={n} onChange={(e) => setN(e.target.value)} className="h-12 text-[16px] outline-none" style={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-[14px]" style={{ color: th.t.muted }}>
          Detail (optional)
          <input aria-label="Habit detail" value={d} onChange={(e) => setD(e.target.value)} placeholder="10 pages" className="h-12 text-[16px] outline-none" style={field} />
        </label>
        <button type="submit" disabled={!n.trim()} className="h-12 rounded-2xl font-semibold disabled:opacity-50" style={{ background: th.accentGradient, color: th.t.onAccent }}>Save</button>
      </form>
    </Sheet>
  );
}

export default function PlantDetail() {
  const { id } = useParams();
  const th = useTheme();
  const state = useAppState();
  const today = useToday();
  const navigate = useNavigate();
  const location = useLocation();
  const [editing, setEditing] = useState(false);
  const found = state.habits.find((h) => h.id === id);
  // A habit removed with no history becomes a tombstone; it stays on screen for the same-day undo.
  const habit = found && (!found.deleted || canRestore(found, today)) ? found : undefined;
  const arc = habit ? state.arcs.find((a) => a.id === habit.arcId && !a.deleted) : undefined;
  if (!habit || !arc) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        <p className="text-[15px]" style={{ color: th.t.muted }}>This plant is no longer in your garden.</p>
        <button type="button" onClick={() => navigate("/")} className="tap self-start font-semibold" style={{ color: th.accent }}>Back to the garden</button>
      </div>
    );
  }
  const r = habitRate(state, habit, today);
  const days = plantDays(state, habit, today);
  const missed = days.filter((d) => d.status === "missed").length;
  const across = habitAcrossArcs(state, habit.name, today);
  const removed = habit.archivedAt !== undefined || habit.deleted === true;
  const finished = arcPhase(arc, today) === "complete" || arc.frozenAt !== undefined;
  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h1 data-testid="plant-name" className="text-[30px] leading-tight" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>{habit.name}</h1>
          {habit.detail && <span className="text-[15px]" style={{ color: th.t.muted }}>{habit.detail}</span>}
        </div>
        <button type="button" aria-label="Close" onClick={() => (location.key === "default" ? navigate("/progress") : navigate(-1))} className="tap flex items-center justify-center rounded-full" style={{ color: th.t.muted }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" /></svg>
        </button>
      </header>
      <BigTree g={growth(r.completedDays, arc.lengthDays)} wilt={removed} season={arc.season} />
      <div className="grid grid-cols-2 gap-2.5">
        <Tile label="Done this arc" value={String(r.completedDays)} unit={`of ${r.scheduledDays}`} testId="plant-done" />
        <Tile label="Streak" value={String(habitStreak(state, habit, today))} unit="days" testId="plant-streak" />
        <Tile label="Best streak" value={String(habitBestStreak(state, habit, today))} unit="days" testId="plant-best" />
        <Tile label="Planted" value={formatMonthDay(habit.createdAt)} testId="plant-planted" />
      </div>
      <section className="flex flex-col gap-2.5">
        <SectionTitle aside={`${missed} missed`}>Every day this arc</SectionTitle>
        <div className="card grid grid-cols-[repeat(13,18px)] justify-between gap-y-1.5 p-3" data-testid="plant-grid">
          {days.map((d) => (
            <span
              key={d.date}
              data-testid="plant-day"
              data-status={d.status}
              title={formatMonthDay(d.date)}
              className="h-[18px] w-[18px]"
              style={{
                borderRadius: 5,
                background: d.status === "done" ? th.accent : d.status === "today" ? rgba(th.accent, 0.25) : "transparent",
                border: d.status === "missed" ? `1.5px solid ${rgba(MISS, 0.8)}` : d.status === "none" ? `1px dashed ${rgba(th.t.muted, 0.35)}` : d.status === "today" ? `1.5px solid ${th.accent}` : "none",
              }}
            />
          ))}
        </div>
      </section>
      {across.length > 1 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Across your arcs</SectionTitle>
          <ul className="card flex flex-col gap-3 p-4">
            {across.map((a) => (
              <li key={a.arc.id} data-testid="across-row" className="flex flex-col gap-1.5">
                <span className="flex justify-between text-[14px]">
                  <span className="font-medium">{a.arc.name}</span>
                  <span className="num" style={{ color: th.t.muted }}>{a.rate === null ? "–" : `${Math.round(a.rate)}%`}</span>
                </span>
                <Bar value={(a.rate ?? 0) / 100} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {finished ? (
        <p className="text-center text-[13px]" style={{ color: th.t.muted }}>This arc is finished, so its plants stay as they were.</p>
      ) : (
      <div className="flex flex-col gap-2.5">
        <button type="button" onClick={() => setEditing(true)} className="h-[50px] rounded-2xl text-[16px] font-semibold" style={{ background: th.isNight ? "#1A1E17" : th.t.surface, boxShadow: `0 0 0 1px ${th.t.line}` }}>
          Edit habit
        </button>
        {removed ? (
          canRestore(habit, today) && <button type="button" data-testid="restore-habit" onClick={() => actions.restoreHabit(today, habit.id)} className="h-[50px] rounded-2xl text-[16px] font-semibold" style={{ color: th.accent, boxShadow: `0 0 0 1px ${th.t.line}` }}>
            Put it back in this arc
          </button>
        ) : (
          <button
            type="button"
            data-testid="remove-plant"
            onClick={() => {
              actions.removeHabit(today, habit.id);
              feedback("remove", state.settings.haptics);
            }}
            className="h-[50px] rounded-2xl text-[16px] font-semibold"
            style={{ color: MISS, boxShadow: `0 0 0 1px ${rgba(MISS, 0.5)}` }}
          >
            Remove from this arc
          </button>
        )}
        <p className="text-center text-[13px]" style={{ color: th.t.muted }}>
          {removed && !canRestore(habit, today) ? `Removed on ${formatMonthDay(habit.archivedAt ?? today)}. Past days stay as they were.` : "Its tree stops growing. Past days stay as they were."}
        </p>
      </div>
      )}
      {editing && <EditHabit id={habit.id} name={habit.name} detail={habit.detail ?? ""} onClose={() => setEditing(false)} />}
    </div>
  );
}
