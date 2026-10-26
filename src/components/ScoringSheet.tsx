import { useSheet } from "../lib/useSheet";
import type { ArcSettings } from "../types";

type Props = { settings: ArcSettings; onClose: () => void };

export default function ScoringSheet({ settings, onClose }: Props) {
  useSheet(onClose);
  const rules = [
    ["Arc days so far", "From your start date through today (or the arc's last day)."],
    ["Scheduled", "A habit counts on a day if it was added on or before that day and not deleted yet."],
    ["Daily completion", "Scheduled habits you checked, divided by scheduled habits, as a percent."],
    ["Overall consistency", "All check-offs divided by all scheduled habit-days across the arc so far. Days you never opened count as 0 done."],
    ["Streak", `A day is kept at ${settings.streakThreshold}% or more. Current streak = kept days in a row ending today; if today isn't kept yet, it counts back from yesterday instead. Longest streak = the longest run inside the arc. Days before the arc don't count.`],
    ["Per-habit consistency", "Days you checked that habit divided by days it was scheduled."],
    ["Averages", "Week, month and weekday figures are the mean of daily completion, unlogged days as 0. Days with no habits scheduled are skipped."],
    ["Sleep score", `50 points for hours against your ${settings.sleepTargetHours}h target, plus 50 points for quality out of 5. Only nights with both values count.`],
    ["Level", "Level = lifetime check-offs divided by 50, rounded down, plus 1. So you start at Level 1 and reach Level 2 at 50. Lifetime counts check-offs of scheduled habits across all your logs."],
    ["Deleting a habit", "A habit that already had scheduled days is archived instead, so past percentages never change."],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="How scoring works">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <section className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-card p-5 pb-8" data-testid="scoring-sheet">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
        <p className="num text-xl font-bold uppercase tracking-wide">How scoring works</p>
        <dl className="mt-3 space-y-3">
          {rules.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-green">{k}</dt>
              <dd className="mt-0.5 text-sm text-muted">{v}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={onClose} className="tap mt-5 w-full rounded-xl border border-line font-semibold text-muted">
          Close
        </button>
      </section>
    </div>
  );
}
