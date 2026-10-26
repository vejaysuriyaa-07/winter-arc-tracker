// Arc complete (SPEC 5.7): the full garden with the flock, then a summary and
// "Start your next arc". Shown once per arc, the first time the app is open after
// its last day ends; closing it freezes the garden into the grove.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import type { Arc } from "../../types";
import { actions, useAppState } from "../../lib/store";
import { arcCelebrationKey, arcSummary } from "../../lib/arcs";
import { arcEnd } from "../../lib/stats";
import { gardenFromState, NO_EVENTS } from "../../lib/garden";
import { feedback } from "../../lib/feedback";
import { useSheet } from "../../lib/useSheet";
import GardenScene from "../../scenes/GardenScene";
import { ThemeScope, useTheme } from "../../theme/ThemeProvider";
import Portal from "../ui/Portal";

function Tile({ label, value, testId }: { label: string; value: string; testId: string }) {
  const th = useTheme();
  return (
    <div className="card flex flex-col gap-1 p-3">
      <span className="num text-[26px] leading-none" data-testid={testId} style={{ fontFamily: th.t.fonts.display }}>{value}</span>
      <span className="text-[13px]" style={{ color: th.t.muted }}>{label}</span>
    </div>
  );
}

function Body({ arc, today, onClose }: { arc: Arc; today: string; onClose: (next: boolean) => void }) {
  const th = useTheme();
  const state = useAppState();
  const s = arcSummary(state, arc, today);
  const model = gardenFromState(state, arc, arcEnd(arc), NO_EVENTS);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-8" style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}>
      <p className="text-[15px]" style={{ color: th.t.muted }}>{arc.lengthDays} days, done</p>
      <h1 className="text-[40px] leading-[1.05]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight, backgroundImage: th.dateInk, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
        {arc.name} is complete
      </h1>
      <div className="overflow-hidden" style={{ borderRadius: th.frame.radius, border: th.frame.border, boxShadow: th.frame.shadow }}>
        <GardenScene model={model} testId="complete-garden" label={`${arc.name}, the full garden`} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Tile label="Arc score" value={s.score === null ? "–" : `${Math.round(s.score)}%`} testId="complete-score" />
        <Tile label="Best streak, days" value={String(s.bestChain)} testId="complete-best" />
        <Tile label="Visitors found" value={String(s.visitors)} testId="complete-visitors" />
        <Tile label="Full days" value={String(s.fullDays)} testId="complete-full" />
      </div>
      <button type="button" onClick={() => onClose(true)} className="h-14 rounded-2xl text-[17px] font-semibold" style={{ background: th.accentGradient, color: th.t.onAccent }}>
        Start your next arc
      </button>
      <button type="button" onClick={() => onClose(false)} className="tap text-[15px] font-medium" style={{ color: th.t.muted }}>
        Not now
      </button>
    </div>
  );
}

export default function ArcComplete({ arc, today }: { arc: Arc; today: string }) {
  const navigate = useNavigate();
  const haptics = useAppState().settings.haptics;
  const closed = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedback("fullBloom", haptics); // on arrival, not on dismiss
  }, []); // once per celebration: the haptics setting at arrival decides
  const close = (next: boolean): void => {
    if (closed.current) return; // one close per celebration, however many presses arrive
    closed.current = true;
    actions.markCelebrated(arcCelebrationKey(arc.id));
    actions.freezeArc(arc.id);
    if (next) navigate("/arcs/new");
  };
  useSheet(() => close(false), box);
  return (
    <Portal>
    <div ref={box} className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true" aria-label={`${arc.name} is complete`} data-testid="arc-complete">
      <ThemeScope look={arc.look} season={arc.season} paint className="min-h-full">
        <Body arc={arc} today={today} onClose={close} />
      </ThemeScope>
    </div>
    </Portal>
  );
}
