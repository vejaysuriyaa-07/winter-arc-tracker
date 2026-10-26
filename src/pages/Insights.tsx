import { useState } from "react";
import EmptyState from "../components/EmptyState";
import SleepTrend from "../components/SleepTrend";
import WaveChart from "../components/WaveChart";
import {
  currentStreak,
  dailySeries,
  hasAnyCheckoff,
  leaderboard,
  longestStreak,
  overallConsistency,
  sleepSummary,
  weakestWeekday,
  weekdayAverages,
  windowed,
} from "../lib/stats";
import { useAppState } from "../lib/store";
import { useToday } from "../lib/today";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WINDOWS: { label: string; n: number | null }[] = [
  { label: "7 days", n: 7 },
  { label: "30 days", n: 30 },
  { label: "All", n: null },
];

function Card({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="card p-4" data-testid={testId}>
      <h2 className="num text-base font-bold uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function Insights() {
  const state = useAppState();
  const today = useToday();
  const [win, setWin] = useState<number | null>(7);
  const started = hasAnyCheckoff(state);
  const consistency = overallConsistency(state, today);
  const series = dailySeries(state, today);
  const sleep = sleepSummary(state, today);
  const rows = leaderboard(state, today);
  const weekdays = weekdayAverages(state, today);
  const weakest = weakestWeekday(weekdays);
  const anyWeekday = started && weekdays.some((v) => v !== null);
  const anyPercent = started && rows.some((r) => r.scheduledDays > 0);

  return (
    <main className="space-y-4">
      <h1 className="num text-2xl font-bold uppercase tracking-wider">Insights</h1>

      <Card title="Overall consistency" testId="card-consistency">
        {started && consistency.percent !== null ? (
          <>
            <p className="num text-6xl font-bold leading-none text-green" data-testid="insights-consistency">
              {Math.round(consistency.percent)}%
            </p>
            <p className="mt-2 text-xs text-dim">
              {consistency.completed} completed of {consistency.scheduled} scheduled check-offs across arc days so far. Unlogged days count as 0 done.
            </p>
          </>
        ) : (
          <EmptyState title="Check off your first habit to start your score" hint="Consistency is completed over scheduled check-offs across the arc so far." />
        )}
      </Card>

      <Card title="Streaks" testId="card-streaks">
        {started ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-dim">Current</p>
              <p className="num text-4xl font-bold text-gold" data-testid="insights-current-streak">
                {currentStreak(state, today)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-dim">Longest</p>
              <p className="num text-4xl font-bold" data-testid="insights-longest-streak">
                {longestStreak(state, today)}
              </p>
            </div>
            <p className="col-span-2 text-xs text-dim">
              A day counts when it reaches {state.settings.streakThreshold}%. Today is in progress and doesn't break the streak until it's over.
            </p>
          </div>
        ) : (
          <EmptyState title="No streak yet" hint={`Hit ${state.settings.streakThreshold}% on a day to light the flame.`} />
        )}
      </Card>

      <Card title="Sleep" testId="card-sleep">
        {sleep.nights === 0 ? (
          <EmptyState title="No sleep logged yet" hint="Enter last night's hours and quality in the daily check-in." />
        ) : (
          <>
            <div className="flex items-baseline gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-dim">Avg hours</p>
                <p className="num text-3xl font-bold">{sleep.avgHours === null ? "–" : sleep.avgHours.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-dim">Avg score</p>
                <p className="num text-3xl font-bold text-green">{sleep.avgScore === null ? "–" : Math.round(sleep.avgScore)}</p>
              </div>
              <p className="ml-auto text-xs text-dim">{sleep.nights} {sleep.nights === 1 ? "night" : "nights"}</p>
            </div>
            {sleep.avgScore === null ? (
              <p className="mt-2 text-xs text-dim">Add a quality rating to see the score trend.</p>
            ) : (
              <div className="mt-2">
                <SleepTrend series={sleep.series} />
              </div>
            )}
          </>
        )}
      </Card>

      <Card title="Habit leaderboard" testId="card-leaderboard">
        {!anyPercent ? (
          <EmptyState title="Nothing to rank yet" hint="Check off a habit and each one gets ranked by its own consistency." />
        ) : (
          <ol className="space-y-2" data-testid="leaderboard">
            {rows.map((r, i) => (
              <li key={r.habit.id} className={`flex items-center gap-3 ${r.archived ? "opacity-40" : ""}`} data-habit={r.habit.name}>
                <span className="num w-5 text-right text-sm text-dim">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm">
                      {r.habit.name}
                      {r.archived && <span className="ml-1 text-[10px] uppercase text-dim">archived</span>}
                    </span>
                    <span className="num text-xs text-muted">
                      {r.completedDays} / {r.scheduledDays} days
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-green" style={{ width: `${r.percent ?? 0}%` }} />
                  </div>
                </div>
                <span className="num w-11 text-right text-base font-bold">{r.percent === null ? "–" : `${Math.round(r.percent)}%`}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="Consistency wave" testId="card-wave">
        {series.length === 0 || !started ? (
          <EmptyState title="No days plotted yet" hint="Daily completion is drawn from your first check-off on." />
        ) : (
          <>
            <div className="mb-2 flex gap-1" role="group" aria-label="Window">
              {WINDOWS.map((w) => (
                <button
                  key={w.label}
                  type="button"
                  aria-pressed={win === w.n}
                  onClick={() => setWin(w.n)}
                  className={`tap flex-1 rounded-lg border text-xs font-semibold ${
                    win === w.n ? "border-green bg-card-2 text-green" : "border-line text-muted"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <WaveChart key={String(win)} points={windowed(series, win)} />
            <p className="mt-1 text-[10px] text-dim">Hollow markers are unlogged days. The gold marker is today, in progress.</p>
          </>
        )}
      </Card>

      <Card title="Weekday breakdown" testId="card-weekdays">
        {!anyWeekday ? (
          <EmptyState title="No weekdays scored yet" hint="Average completion per weekday appears after your first check-off." />
        ) : (
          <div className="grid grid-cols-7 gap-2" data-testid="weekday-bars">
            {weekdays.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`num text-[11px] ${i === weakest ? "text-red" : "text-muted"}`}>{v === null ? "–" : Math.round(v)}</span>
                <div className="flex h-20 w-full items-end rounded-md bg-line/40">
                  <div
                    className={`w-full rounded-md ${i === weakest ? "bg-red" : "bg-green"}`}
                    style={{ height: `${v ?? 0}%` }}
                    data-weakest={i === weakest ? "true" : undefined}
                  />
                </div>
                <span className={`text-[10px] ${i === weakest ? "text-red" : "text-dim"}`}>{WEEKDAYS[i]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
