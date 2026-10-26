// A small, still copy of the Garden tab in a given look and season, drawn with the
// person's own garden and habits (ThemePicker.dc.html preview, scaled 0.62).
import type { Look, Season } from "../../types";
import type { SceneModel } from "../../lib/garden";
import { themeLabel } from "../../lib/arcs";
import GardenScene from "../../scenes/GardenScene";
import { MOOD_ICONS } from "../garden/MoodRow";
import { MOODS } from "../../types";
import { ThemeScope, useTheme } from "../../theme/ThemeProvider";

const W = 390;
const SCALE = 0.62;

function Body({ model, habits, arcName, weekday, date }: { model: SceneModel; habits: string[]; arcName: string; weekday: string; date: string }) {
  const th = useTheme();
  return (
    <div className="flex flex-col gap-[18px] px-4 pt-4" style={{ width: W }}>
      <div className="flex h-11 items-center justify-between">
        <span style={{ fontFamily: th.t.fonts.display, fontStyle: th.t.fonts.wordmarkStyle, fontWeight: th.t.fonts.wordmarkWeight, fontSize: th.t.fonts.wordmarkSize }}>{th.t.fonts.wordmark}</span>
        <span className="flex h-10 items-center rounded-full text-[15px] font-medium" style={{ padding: `0 ${th.chip.padX}px`, background: th.chip.background, border: th.chip.border }}>{arcName}</span>
      </div>
      <div className="-mt-1.5 flex flex-col gap-1">
        <span className="self-start text-[48px] leading-[1.05]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight, backgroundImage: th.dateInk, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{weekday}</span>
        <span className="text-[15px]" style={{ color: th.t.muted }}>{date}</span>
      </div>
      <div className="overflow-hidden" style={{ borderRadius: th.frame.radius, border: th.frame.border, boxShadow: th.frame.shadow }}>
        <GardenScene model={model} still testId="garden-preview" />
      </div>
      <div className="grid grid-cols-5" style={{ gap: th.moodWrap.gap, padding: th.moodWrap.pad, borderRadius: th.moodWrap.radius, background: th.moodWrap.background, boxShadow: th.moodWrap.shadow }}>
        {MOODS.map((m) => {
          const s = th.moodButton(m === "good");
          return (
            <span key={m} className="flex h-12 items-center justify-center" style={{ borderRadius: s.radius, border: s.border, background: s.background, color: s.color, boxShadow: s.shadow }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={MOOD_ICONS[m]} /></svg>
            </span>
          );
        })}
      </div>
      <div className="flex flex-col" style={{ gap: th.listWrap.gap, background: th.listWrap.background, borderRadius: th.listWrap.radius, borderTop: th.listWrap.borderTop, boxShadow: th.listWrap.shadow }}>
        {habits.slice(0, 3).map((name, i, all) => {
          const r = th.row(false, i === all.length - 1);
          return (
            <div key={`${name}-${i}`} className="flex min-h-14 items-center gap-3" style={{ padding: `6px ${th.listWrap.padR}px 6px ${th.listWrap.padL}px`, background: r.background, boxShadow: r.shadow, borderRadius: r.radius, borderBottom: r.divider }}>
              <span className="h-6 w-6 rounded-full" style={{ border: `1.5px solid ${th.checkRing(false)}` }} />
              <span className="font-medium">{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GardenPreview(props: { look: Look; season: Season; height?: number; model: SceneModel; habits: string[]; arcName: string; weekday: string; date: string }) {
  const { look, season, height = 330 } = props;
  return (
    <ThemeScope look={look} season={season} paint data-testid="theme-preview" className="relative overflow-hidden" style={{ height, borderRadius: 24 }}>
      <div role="img" aria-label={`Preview: ${themeLabel(look, season)}`} style={{ width: W, transform: `scale(${SCALE})`, transformOrigin: "0 0", position: "absolute", left: "50%", marginLeft: -(W * SCALE) / 2, top: 0, height: height / SCALE }}>
        <Body {...props} />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <span className="rounded-full px-3 py-1 text-[13px] font-semibold text-white" style={{ background: "rgba(20, 20, 16, 0.58)", backdropFilter: "blur(6px)" }}>{themeLabel(look, season)}</span>
      </div>
    </ThemeScope>
  );
}
