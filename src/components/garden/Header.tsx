// "Grove" wordmark and the arc switcher chip, which opens a sheet of active arcs.
import { useState } from "react";
import { Link } from "react-router";
import type { AppState, Arc } from "../../types";
import { arcDayNumber, arcPhase } from "../../lib/stats";
import { formatMonthDay } from "../../lib/dates";
import { useTheme } from "../../theme/ThemeProvider";
import Sheet from "../ui/Sheet";

export function Wordmark() {
  const f = useTheme().t.fonts;
  return (
    <span data-testid="wordmark" style={{ fontFamily: f.display, fontStyle: f.wordmarkStyle, fontWeight: f.wordmarkWeight, fontSize: f.wordmarkSize, lineHeight: 1 }}>
      {f.wordmark}
    </span>
  );
}

function status(arc: Arc, today: string): string {
  const p = arcPhase(arc, today);
  if (p === "before") return `Starts ${formatMonthDay(arc.startDate)}`;
  if (p === "complete") return "Finished";
  return `Day ${arcDayNumber(arc, today)} of ${arc.lengthDays}`;
}

export default function Header({ state, arc, today, onSwitch, title }: { state: AppState; arc: Arc | undefined; today: string; onSwitch: (id: string) => void; title?: string }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  const arcs = state.arcs.filter((a) => !a.deleted && (arcPhase(a, today) !== "complete" || a.frozenAt === undefined || a.id === arc?.id));
  return (
    <header className="flex h-11 items-center justify-between">
      {title ? (
        <h1 className="text-[30px] leading-none" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>{title}</h1>
      ) : (
        <Wordmark />
      )}
      {arc && (
        <button
          type="button"
          aria-label={`Switch arc, ${arc.name}`}
          data-testid="arc-switcher"
          onClick={() => setOpen(true)}
          className="tap flex h-10 items-center gap-1.5 rounded-full text-[15px] font-medium"
          style={{ padding: `0 ${th.chip.padX}px`, background: th.chip.background, border: th.chip.border }}
        >
          <span data-testid="arc-name">{arc.name}</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9L12 15L18 9" />
          </svg>
        </button>
      )}
      {open && (
        <Sheet title="Your arcs" onClose={() => setOpen(false)} testId="arc-sheet">
          <ul className="flex flex-col gap-2">
            {arcs.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  data-testid="arc-option"
                  aria-current={a.id === arc?.id ? "true" : undefined}
                  onClick={() => {
                    onSwitch(a.id);
                    setOpen(false);
                  }}
                  className="card flex min-h-14 w-full items-center justify-between px-4 text-left"
                  style={a.id === arc?.id ? { outline: `2px solid ${th.accent}`, outlineOffset: -2 } : undefined}
                >
                  <span className="font-medium">{a.name}</span>
                  <span className="text-sm" style={{ color: th.t.muted }}>{status(a, today)}</span>
                </button>
              </li>
            ))}
          </ul>
          <Link to="/arcs/new" onClick={() => setOpen(false)} className="mt-3 flex h-12 items-center justify-center rounded-2xl font-semibold" style={{ background: th.accentGradient, color: th.t.onAccent }}>
            Start a new arc
          </Link>
        </Sheet>
      )}
    </header>
  );
}
