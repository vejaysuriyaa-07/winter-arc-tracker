// The theme picker sheet (SPEC 5.6b, ThemePicker.dc.html). The sheet restyles live
// as you pick; "Use this theme" applies it.
import { useRef, useState } from "react";
import type { Look, Season } from "../../types";
import type { SceneModel } from "../../lib/garden";
import { useSheet } from "../../lib/useSheet";
import { ThemeScope, useSystemDark, useTheme } from "../../theme/ThemeProvider";
import Toggle from "../ui/Toggle";
import Portal from "../ui/Portal";
import GardenPreview from "./GardenPreview";
import { LookCards, SeasonCards } from "./ThemeCards";

type Props = {
  look: Look;
  season: Season;
  autoNight: boolean;
  preview: { model: (season: Season) => SceneModel; habits: string[]; arcName: string; weekday: string; date: string };
  onUse: (look: Look, season: Season, autoNight: boolean) => void;
  onCancel: () => void;
};

function Inner({ look, season, autoNight, dark, setLook, setSeason, setAuto, preview, onUse, onCancel }: {
  dark: boolean;
  look: Look; season: Season; autoNight: boolean; setLook: (l: Look) => void; setSeason: (s: Season) => void; setAuto: (v: boolean) => void;
  preview: Props["preview"]; onUse: () => void; onCancel: () => void;
}) {
  const th = useTheme();
  return (
    <section
      data-testid="theme-picker"
      className="relative flex max-h-[92dvh] w-full max-w-md flex-col gap-4 overflow-y-auto px-4 pt-2"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        background: th.isNight ? "linear-gradient(180deg, #1C2119 0%, #151913 100%)" : `linear-gradient(180deg, ${th.t.base[0]} 0%, ${th.t.base[1]} 100%)`,
        borderRadius: "24px 24px 0 0",
        color: th.t.text,
      }}
    >
      <div aria-hidden="true" className="mx-auto h-[5px] w-10 flex-none rounded-full" style={{ background: th.t.line }} />
      <div className="grid grid-cols-[80px_1fr_80px] items-center">
        <button type="button" onClick={onCancel} className="tap justify-self-start text-[15px]" style={{ color: th.t.muted }}>Cancel</button>
        <h2 className="text-center text-[22px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Garden theme</h2>
        <span />
      </div>
      {autoNight && dark && look !== "night" && (
        <p data-testid="dark-note" className="text-[13px]" style={{ color: th.t.muted }}>
          Your iPhone is in dark mode, so Night shows while "Night look in dark mode" is on.
        </p>
      )}
      <GardenPreview look={look} season={season} model={preview.model(season)} habits={preview.habits} arcName={preview.arcName} weekday={preview.weekday} date={preview.date} />
      <h3 className="text-[15px] font-semibold" style={{ color: th.t.muted }}>Look</h3>
      <LookCards season={season} value={look} onChange={setLook} />
      <h3 className="text-[15px] font-semibold" style={{ color: th.t.muted }}>Season</h3>
      <SeasonCards value={season} onChange={setSeason} />
      <Toggle label="Night look in dark mode" detail="Switches when your iPhone does" checked={autoNight} onChange={setAuto} testId="auto-night" />
      <button type="button" onClick={onUse} className="h-[54px] flex-none rounded-2xl text-[16px] font-semibold" style={{ background: th.accentGradient, color: th.t.onAccent, boxShadow: `0 10px 18px -12px ${th.accent}` }}>
        Use this theme
      </button>
    </section>
  );
}

export default function ThemePicker({ look: l0, season: s0, autoNight: a0, preview, onUse, onCancel }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useSheet(onCancel, box);
  const dark = useSystemDark();
  const [look, setLook] = useState(l0);
  const [season, setSeason] = useState(s0);
  const [auto, setAuto] = useState(a0);
  return (
    <Portal>
    <div ref={box} className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Garden theme">
      <button type="button" aria-label="Close" onClick={onCancel} className="absolute inset-0" style={{ background: "rgba(15, 14, 10, 0.45)" }} />
      <ThemeScope look={look} season={season} className="relative flex w-full max-w-md justify-center">
        <Inner look={look} season={season} autoNight={auto} dark={dark} setLook={setLook} setSeason={setSeason} setAuto={setAuto} preview={preview} onUse={() => onUse(look, season, auto)} onCancel={onCancel} />
      </ThemeScope>
    </div>
    </Portal>
  );
}
