import { useEffect, useState } from "react";
import type { DayLog, Rating } from "../types";

type Props = {
  log: DayLog | undefined;
  onMood: (mood: Rating | undefined) => void;
  onSleep: (input: { hours?: number | undefined; quality?: Rating | undefined }) => void;
  onWin: (text: string) => void;
};

const MOODS: { value: Rating; emoji: string; label: string }[] = [
  { value: 1, emoji: "😫", label: "Awful" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "🤩", label: "Great" },
];
const RATINGS: Rating[] = [1, 2, 3, 4, 5];

function clampHours(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(24, n));
}

export default function CheckIn({ log, onMood, onSleep, onWin }: Props) {
  // Local text so partial input like "7." survives until it parses.
  const stored = log?.sleepHours;
  const [hoursText, setHoursText] = useState(stored === undefined ? "" : String(stored));
  useEffect(() => {
    setHoursText(stored === undefined ? "" : String(stored));
  }, [stored]);

  function commitHours(text: string): void {
    const hours = clampHours(text);
    if (hours !== stored) onSleep({ hours });
  }

  return (
    <section className="card p-4" aria-labelledby="checkin-title">
      <h2 id="checkin-title" className="num text-lg font-bold uppercase tracking-wide text-muted">
        Daily check-in
      </h2>

      <div className="mt-3">
        <p className="text-xs uppercase tracking-wide text-dim">Mood</p>
        <div className="mt-1 flex justify-between gap-1" role="radiogroup" aria-label="Mood">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={log?.mood === m.value}
              aria-label={m.label}
              onClick={() => onMood(log?.mood === m.value ? undefined : m.value)}
              className={`tap flex-1 rounded-xl border text-2xl ${
                log?.mood === m.value ? "border-green bg-card-2" : "border-line"
              }`}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3">
        <label htmlFor="sleep-hours" className="text-xs uppercase tracking-wide text-dim">
          Sleep hrs
        </label>
        <input
          id="sleep-hours"
          type="number"
          inputMode="decimal"
          min={0}
          max={24}
          step={0.5}
          value={hoursText}
          onChange={(e) => {
            setHoursText(e.target.value);
            if (e.target.value !== "" && Number.isFinite(Number(e.target.value))) commitHours(e.target.value);
          }}
          onBlur={() => commitHours(hoursText)}
          placeholder="e.g. 7.5"
          className="tap num w-full rounded-xl bg-bg px-3 text-lg placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-green/60"
        />
        <span className="text-xs uppercase tracking-wide text-dim">Quality</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Sleep quality">
          {RATINGS.map((q) => (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={log?.sleepQuality === q}
              aria-label={`Quality ${q}`}
              onClick={() => onSleep({ quality: log?.sleepQuality === q ? undefined : q })}
              className={`tap num flex-1 rounded-xl border text-base font-bold ${
                log?.sleepQuality === q ? "border-green bg-card-2 text-green" : "border-line text-muted"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="win" className="text-xs uppercase tracking-wide text-dim">
          One win today:
        </label>
        <input
          id="win"
          value={log?.journalWin ?? ""}
          onChange={(e) => onWin(e.target.value)}
          placeholder="Something you're proud of"
          className="tap mt-1 w-full rounded-xl bg-bg px-3 text-[15px] placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-green/60"
        />
      </div>
    </section>
  );
}
