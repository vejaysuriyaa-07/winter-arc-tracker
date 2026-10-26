// Look and season cards from docs/design/ThemePicker.dc.html. Each card is drawn
// in the theme it stands for; the selected one gets a 2px accent border.
import { LOOKS, SEASONS, type Look, type Season } from "../../types";
import { LOOK_NAMES } from "../../lib/arcs";
import { NO_EVENTS, sceneModel } from "../../lib/garden";
import GardenScene from "../../scenes/GardenScene";
import { rnd, themeFor } from "../../theme/tokens";
import { useTheme } from "../../theme/ThemeProvider";
import { radioKeys } from "../ui/useRadioKeys";

const SEASON_NAMES: Record<Season, string> = { winter: "Winter", spring: "Spring", summer: "Summer", autumn: "Autumn" };

export function LookCards({ season, value, onChange }: { season: Season; value: Look; onChange: (l: Look) => void }) {
  const sel = useTheme();
  const keys = radioKeys(LOOKS, value, onChange);
  return (
    <div role="radiogroup" aria-label="Look" className="grid grid-cols-3 gap-2.5" onKeyDown={keys.onKeyDown}>
      {LOOKS.map((look) => {
        const th = themeFor(look, season);
        const on = look === value;
        return (
          <button
            key={look}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={keys.tabIndex(look)}
            data-testid={`look-${look}`}
            onClick={() => onChange(look)}
            className="relative flex h-32 flex-col gap-1.5 overflow-hidden p-2.5 text-left"
            style={{
              borderRadius: 16,
              background: th.isNight ? "linear-gradient(180deg, #151913 0%, #0D100B 100%)" : `linear-gradient(180deg, ${th.t.base[0]} 0%, ${th.t.base[1]} 100%)`,
              color: th.t.text,
              boxShadow: on ? `0 0 0 2px ${sel.accent}` : `0 0 0 1px ${sel.t.line}`,
            }}
          >
            {th.isNight &&
              Array.from({ length: 14 }, (_, i) => (
                <span key={i} aria-hidden="true" className="absolute rounded-full" style={{ left: `${rnd(i, 1) * 100}%`, top: `${rnd(i, 2) * 100}%`, width: 1.5, height: 1.5, background: "#F3EDE0", opacity: 0.3 + rnd(i, 3) * 0.6 }} />
              ))}
            <span className="relative text-2xl leading-none" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Mon</span>
            <span aria-hidden="true" className="relative h-[30px] w-full" style={{ borderRadius: 8, background: `linear-gradient(180deg, ${th.isNight ? "#2A3A5A" : "#86BFE6"} 0%, ${th.tint} 100%)` }} />
            {[0, 1].map((r) => (
              <span key={r} aria-hidden="true" className="relative flex h-3 items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: r === 0 ? th.accent : "transparent", border: `1px solid ${th.accent}` }} />
                <span className="h-[3px] flex-1" style={{ borderRadius: th.t.list === "tiles" ? 4 : 2, background: th.t.list === "tiles" ? th.t.surface : th.t.line }} />
              </span>
            ))}
            <span className="relative mt-auto text-[12px] font-semibold" style={{ fontFamily: th.t.fonts.body }}>{LOOK_NAMES[look]}</span>
          </button>
        );
      })}
    </div>
  );
}

function miniModel(season: Season) {
  return sceneModel({
    season, mood: "good", events: NO_EVENTS, lengthDays: 90, dayNumber: 30,
    plants: [0.7, 0.9, 0.6, 0.8, 0.5].map((r, i) => ({ id: `m${i}`, daysDone: Math.round(60 * r), wilt: false })),
    keptDays: Array.from({ length: 12 }, () => ({ full: false })),
    bloom: false,
  });
}
const MINI = Object.fromEntries(SEASONS.map((s) => [s, miniModel(s)])) as Record<Season, ReturnType<typeof miniModel>>;

export function SeasonCards({ value, onChange }: { value: Season; onChange: (s: Season) => void }) {
  const th = useTheme();
  const keys = radioKeys(SEASONS, value, onChange);
  return (
    <div role="radiogroup" aria-label="Season" className="grid grid-cols-4 gap-2" onKeyDown={keys.onKeyDown}>
      {SEASONS.map((s) => {
        const on = s === value;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={keys.tabIndex(s)}
            data-testid={`season-${s}`}
            onClick={() => onChange(s)}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="block w-full overflow-hidden" style={{ borderRadius: 14, boxShadow: on ? `0 0 0 2px ${th.accent}` : `0 0 0 1px ${th.t.line}` }}>
              <GardenScene model={MINI[s]} still height={240} label={`${SEASON_NAMES[s]} garden`} testId="garden-mini" />
            </span>
            <span className="text-[13px] font-medium" style={{ color: on ? th.t.text : th.t.muted }}>{SEASON_NAMES[s]}</span>
          </button>
        );
      })}
    </div>
  );
}
