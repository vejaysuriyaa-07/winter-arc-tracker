import ArcStatusCard from "../components/ArcStatusCard";
import CheckIn from "../components/CheckIn";
import HabitRow from "../components/HabitRow";
import ProgressRing from "../components/ProgressRing";
import QuickAdd from "../components/QuickAdd";
import StreakFlame from "../components/StreakFlame";
import WaveProgress from "../components/WaveProgress";
import { diffDays, formatShort } from "../lib/dates";
import {
  arcDayNumber,
  arcPhase,
  currentStreak,
  daysLeft,
  dailyCompletion,
  hasAnyCheckoff,
  levelProgress,
  lifetimeCheckoffs,
  longestStreak,
  overallConsistency,
  scheduledHabits,
} from "../lib/stats";
import { actions, useAppState } from "../lib/store";
import { useToday } from "../lib/today";

export default function Today() {
  const state = useAppState();
  const today = useToday();
  const { settings } = state;
  const phase = arcPhase(settings, today);
  const log = state.logs[today];
  const done = new Set(log?.completedHabitIds ?? []);
  const habits = scheduledHabits(state.habits, phase === "before" ? settings.startDate : today);
  const completion = dailyCompletion(state, today);
  const percent = completion.percent ?? 0;
  const consistency = overallConsistency(state, today);
  const streak = currentStreak(state, today);
  const lifetime = lifetimeCheckoffs(state);
  const lp = levelProgress(lifetime);
  const started = hasAnyCheckoff(state);
  const dayNumber = arcDayNumber(settings, today);

  return (
    <main className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="num text-2xl font-bold uppercase tracking-wider leading-none">Winter Arc</p>
          <p className="mt-1 text-xs text-muted">
            {formatShort(today)}
            {phase === "active" && (
              <span className="text-dim" data-testid="days-left">
                {" · "}
                {daysLeft(settings, today)} {daysLeft(settings, today) === 1 ? "day" : "days"} left
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="num rounded-full border border-line bg-card px-3 py-1.5 text-sm font-bold text-muted"
            data-testid="day-pill"
          >
            {phase === "before" ? "Starts soon" : phase === "complete" ? "Complete" : `Day ${dayNumber} / ${settings.lengthDays}`}
          </span>
          <StreakFlame streak={streak} />
        </div>
      </header>

      {phase === "before" && <ArcStatusCard kind="before" daysUntil={diffDays(today, settings.startDate)} />}

      {phase === "complete" && (
        <ArcStatusCard
          kind="complete"
          consistency={consistency.percent}
          longestStreak={longestStreak(state, today)}
          level={lp.level}
        />
      )}

      {phase === "active" && (
        <>
          <WaveProgress percent={percent} gold={completion.scheduled > 0 && percent >= 100}>
            <p className="num text-7xl font-bold leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]" data-testid="percent">
              {completion.scheduled === 0 ? "–" : `${Math.round(percent)}%`}
            </p>
            <p className="mt-1 text-sm text-ink/80 drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
              {completion.scheduled === 0 ? "Add a habit to start" : `${completion.completed} of ${completion.scheduled} habits done`}
            </p>
          </WaveProgress>

          <section className="card flex items-center gap-4 p-4" aria-label="Score">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-dim">Overall consistency</p>
              {started && consistency.percent !== null ? (
                <p className="num text-4xl font-bold leading-none text-green" data-testid="consistency">
                  {Math.round(consistency.percent)}%
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted" data-testid="consistency-empty">
                  Check off your first habit to start your score
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative text-green">
                <ProgressRing value={lp.into} max={lp.needed} size={60} />
                <span className="num absolute inset-0 flex items-center justify-center text-lg font-bold text-ink">
                  {lp.level}
                </span>
              </div>
              <div className="text-right">
                <p className="num text-base font-bold leading-none" data-testid="level">
                  Level {lp.level}
                </p>
                <p className="num mt-1 text-xs text-muted">
                  {lp.into} / {lp.needed} to Level {lp.next}
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {phase !== "complete" && (
        <section aria-label="Habits">
          {habits.length === 0 ? (
            <div className="card p-5 text-center text-sm text-muted" data-testid="habits-empty">
              No habits scheduled yet. Add one below to start your day.
            </div>
          ) : (
            <ul className="space-y-2">
              {habits.map((h) => (
                <HabitRow
                  key={h.id}
                  habit={h}
                  checked={done.has(h.id)}
                  disabled={phase !== "active"}
                  onToggle={() => actions.toggleHabit(today, h.id)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {phase === "active" && (
        <>
          <QuickAdd onAdd={(name, category) => actions.addHabit(today, { name, category })} />
          <CheckIn
            log={log}
            onMood={(mood) => actions.setMood(today, mood)}
            onSleep={(input) => actions.setSleep(today, input)}
            onWin={(text) => actions.setJournalWin(today, text)}
          />
        </>
      )}
    </main>
  );
}
