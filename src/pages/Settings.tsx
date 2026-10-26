// Settings. Phase 3 provides the arc's garden theme and the night-look switch;
// the rest of SPEC 5.10 arrives in phase 6.
import { useState } from "react";
import { actions, useAppState } from "../lib/store";
import { useToday } from "../lib/today";
import { activeArc, arcHabits } from "../lib/stats";
import { themeLabel } from "../lib/arcs";
import { previewModel } from "../lib/garden";
import ThemePicker from "../components/theme/ThemePicker";
import Toggle from "../components/ui/Toggle";
import { useTheme } from "../theme/ThemeProvider";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });

export default function Settings() {
  const th = useTheme();
  const state = useAppState();
  const today = useToday();
  const arc = activeArc(state);
  const [picking, setPicking] = useState(false);
  const habits = arc ? arcHabits(state, arc.id).filter((h) => h.archivedAt === undefined).map((h) => h.name) : [];
  const d = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)));
  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex h-11 items-center">
        <h1 className="text-[30px] leading-none" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Settings</h1>
      </header>
      {arc && (
        <section className="card flex flex-col px-4">
          <h2 className="pt-3 text-[13px] font-semibold uppercase tracking-wide" style={{ color: th.t.muted }}>This arc</h2>
          <button type="button" data-testid="theme-row" onClick={() => setPicking(true)} className="flex min-h-[52px] items-center justify-between text-left">
            <span className="text-[16px] font-medium">Garden theme</span>
            <span className="text-[15px]" style={{ color: th.t.muted }}>{themeLabel(arc.look, arc.season)}</span>
          </button>
        </section>
      )}
      <section className="card flex flex-col px-4">
        <h2 className="pt-3 text-[13px] font-semibold uppercase tracking-wide" style={{ color: th.t.muted }}>Feel</h2>
        <Toggle label="Night look in dark mode" detail="Switches when your iPhone does" checked={state.settings.autoNight} onChange={(v) => actions.updateSettings({ autoNight: v })} testId="settings-auto-night" />
      </section>
      {picking && arc && (
        <ThemePicker
          look={arc.look}
          season={arc.season}
          autoNight={state.settings.autoNight}
          preview={{ model: (season) => previewModel(state, arc, today, season, habits.length), habits, arcName: arc.name, weekday: WEEKDAY.format(d), date: MONTH_DAY.format(d) }}
          onCancel={() => setPicking(false)}
          onUse={(look, season, autoNight) => {
            actions.setTheme(arc.id, look, season);
            actions.updateSettings({ autoNight });
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
