// Visitors (SPEC 5.8, Visitors.dc.html): season tabs, X of 9 found, the next
// visitor, and a three-column grid (found in colour, locked as silhouettes).
import { useState } from "react";
import { useNavigate } from "react-router";
import { SEASONS, type Season } from "../types";
import { useAppState } from "../lib/store";
import { useToday } from "../lib/today";
import { activeArc, arcDayNumber } from "../lib/stats";
import { arcFound, foundInSeason, nextVisitor, ruleText, teaser, VISITORS, visitorProgress } from "../lib/visitors";
import { SCENE_PALETTES } from "../lib/garden";
import VisitorArt from "../components/visitors/VisitorArt";
import { Bar } from "../components/progress/Bits";
import { radioKeys } from "../components/ui/useRadioKeys";
import { useTheme } from "../theme/ThemeProvider";
import { rgba } from "../theme/tokens";

const NAMES: Record<Season, string> = { winter: "Winter", spring: "Spring", summer: "Summer", autumn: "Autumn" };

export default function Visitors() {
  const th = useTheme();
  const state = useAppState();
  const today = useToday();
  const navigate = useNavigate();
  const arc = activeArc(state);
  const [season, setSeason] = useState<Season>(arc?.season ?? "winter");
  const keys = radioKeys(SEASONS, season, setSeason);

  // Found in any arc of that season (visitors are stored per arc and never lost).
  const foundIn = (s: Season) => new Map(foundInSeason(state, s).map((v) => [v.visitorId, v] as const));
  const found = foundIn(season);
  const isArcSeason = arc?.season === season;
  const progress = arc && isArcSeason ? visitorProgress(state, arc, today) : [];
  const next = arc && isArcSeason ? nextVisitor(state, arc, today, new Set(arcFound(state, arc).map((r) => r.visitorId))) : null;
  const sky = SCENE_PALETTES[season].sky.good;
  const length = arc?.lengthDays ?? 90;

  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex h-11 items-center justify-between">
        <button type="button" onClick={() => navigate("/progress")} className="tap flex items-center gap-1 text-[15px] font-medium" style={{ color: th.accent }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 6L9 12L15 18" /></svg>
          Progress
        </button>
      </header>
      <div className="flex flex-col gap-1">
        <h1 className="text-[34px] leading-none" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Visitors</h1>
        <p data-testid="found-count" className="text-[15px]" style={{ color: th.t.muted }}>{found.size} of 9 found this {season}</p>
      </div>
      <div role="radiogroup" aria-label="Season" onKeyDown={keys.onKeyDown} className="flex gap-2 overflow-x-auto">
        {SEASONS.map((s) => {
          const on = s === season;
          const n = foundIn(s).size;
          return (
            <button key={s} type="button" role="radio" aria-checked={on} tabIndex={keys.tabIndex(s)} onClick={() => setSeason(s)} className="h-10 flex-none rounded-full px-4 text-[14px] font-semibold" style={{ background: on ? th.accentGradient : th.isNight ? "#1A1E17" : th.t.surface, color: on ? th.t.onAccent : th.t.text, boxShadow: on ? "none" : `0 0 0 1px ${th.t.line}` }}>
              {NAMES[s]}{n > 0 ? ` ${n}/9` : ""}
            </button>
          );
        })}
      </div>

      {next && (
        <section data-testid="next-visitor" className="card flex items-center gap-4 p-4">
          <span className="flex h-24 w-24 flex-none items-center justify-center rounded-2xl" style={{ border: `1.5px dashed ${rgba("#F5B83D", 0.8)}`, background: th.isNight ? "#10140E" : rgba(th.t.text, 0.04) }}>
            <VisitorArt id={next.visitor.id} size={72} locked silhouette={th.isNight ? "#2A3026" : "#B9B2A3"} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: th.t.muted }}>Next visitor</span>
            <span className="text-[20px]" style={{ fontFamily: th.t.fonts.display }}>{next.visitor.name}</span>
            <span className="text-[13px]" style={{ color: th.t.muted }}>Arrives after {ruleText(next.visitor.rule, length).replace(/^Rare, on any full day$/, "any full day, with luck").toLowerCase()}</span>
            <Bar value={next.fraction} />
            <span data-testid="next-teaser" className="text-[13px]" style={{ color: th.accent }}>{teaser(next)}</span>
          </span>
        </section>
      )}

      <ul className="grid grid-cols-3 gap-2.5" data-testid="visitor-grid">
        {VISITORS[season].map((v) => {
          const rec = found.get(v.id);
          const p = progress.find((x) => x.visitor.id === v.id);
          const recArc = rec ? state.arcs.find((a) => a.id === rec.arcId) : undefined;
          return (
            <li key={v.id} data-testid="visitor-tile" data-found={rec ? "true" : "false"} className="flex flex-col gap-1.5">
              <span className="flex h-[84px] items-center justify-center rounded-xl" style={{ background: rec ? `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 100%)` : th.isNight ? "#10140E" : rgba(th.t.text, 0.05), border: rec ? "none" : `1px dashed ${th.t.line}` }}>
                <VisitorArt id={v.id} size={64} locked={!rec} silhouette={th.isNight ? "#2A3026" : "#B9B2A3"} />
              </span>
              <span className="text-[14px] font-medium leading-tight">{rec ? v.name : "Locked"}</span>
              {rec && recArc ? (
                <span className="text-[12px]" style={{ color: th.t.muted }}>Came on day {arcDayNumber(recArc, rec.foundOn)}</span>
              ) : (
                <>
                  <span className="text-[12px] leading-tight" style={{ color: th.t.muted }}>{ruleText(v.rule, length)}</span>
                  {p && v.rule !== 9 && <Bar value={p.fraction} />}
                </>
              )}
            </li>
          );
        })}
      </ul>
      {!arc && <p className="text-[14px]" style={{ color: th.t.muted }}>Start an arc: kept days bring visitors to its garden.</p>}
    </div>
  );
}
