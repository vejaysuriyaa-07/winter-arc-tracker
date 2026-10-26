// "How are you feeling?": five weather buttons in the look's mood style (Skin.dc.html).
import { MOODS, type Mood, type Season } from "../../types";
import { moodLabel } from "../../lib/today-view";
import { useTheme } from "../../theme/ThemeProvider";

export const MOOD_ICONS: Record<Mood, string> = {
  great: "M12 7.5A4.5 4.5 0 1 0 12 16.5A4.5 4.5 0 1 0 12 7.5ZM12 2V4M12 20V22M4.9 4.9L6.3 6.3M17.7 17.7L19.1 19.1M2 12H4M20 12H22M4.9 19.1L6.3 17.7M17.7 6.3L19.1 4.9",
  good: "M8 3V4.5M3.5 7.5H5M4.8 4.3L5.8 5.3M11.2 4.3L10.2 5.3M5.4 10.6A3 3 0 0 1 10.6 7.8M17 20H8A4 4 0 1 1 9.2 12.2A5 5 0 0 1 18.8 13.6A3.2 3.2 0 0 1 17 20Z",
  okay: "M17.5 19H8A5 5 0 1 1 9.6 9.3A6 6 0 0 1 20.8 12.5A3.5 3.5 0 0 1 17.5 19Z",
  low: "M17.5 14H8A4.5 4.5 0 1 1 9.5 5.3A5.5 5.5 0 0 1 19.8 8.2A3 3 0 0 1 17.5 14ZM8 17V19M12 18V20M16 17V19",
  rough: "M17.5 13H8A4.5 4.5 0 1 1 9.5 4.3A5.5 5.5 0 0 1 19.8 7.2A3 3 0 0 1 17.5 13ZM13 14L10.5 18H14L11.5 22",
};

const NAMES: Record<Mood, string> = { great: "Great", good: "Good", okay: "Okay", low: "Low", rough: "Rough" };

export default function MoodRow({ mood, season, disabled, onPick }: { mood: Mood; season: Season; disabled: boolean; onPick: (m: Mood) => void }) {
  const th = useTheme();
  const w = th.moodWrap;
  return (
    <section aria-label="Mood" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-medium" style={{ color: th.t.muted }}>How are you feeling?</h2>
        <span data-testid="mood-label" className="text-base italic" style={{ fontFamily: th.t.fonts.display }}>{moodLabel(mood, season)}</span>
      </div>
      <div className="grid grid-cols-5" style={{ gap: w.gap, padding: w.pad, borderRadius: w.radius, background: w.background, boxShadow: w.shadow }}>
        {MOODS.map((m) => {
          const s = th.moodButton(m === mood);
          return (
            <button
              key={m}
              type="button"
              aria-label={NAMES[m]}
              aria-pressed={m === mood}
              disabled={disabled}
              onClick={() => onPick(m)}
              className="flex h-12 items-center justify-center"
              style={{ borderRadius: s.radius, border: s.border, background: s.background, color: s.color, boxShadow: s.shadow, transition: "color 200ms, box-shadow 200ms", opacity: disabled ? 0.55 : 1 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={MOOD_ICONS[m]} />
              </svg>
            </button>
          );
        })}
      </div>
    </section>
  );
}
