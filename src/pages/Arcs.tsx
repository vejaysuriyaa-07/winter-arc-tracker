// All arcs (SPEC 5.6, Arcs.dc.html): two-column cards, each in its own look and season.
import { Link, useNavigate } from "react-router";
import type { Arc } from "../types";
import { actions, useAppState } from "../lib/store";
import { useToday } from "../lib/today";
import { arcStatus } from "../lib/arcs";
import { arcEnd } from "../lib/stats";
import { minDay } from "../lib/dates";
import { gardenFromState, NO_EVENTS } from "../lib/garden";
import GardenScene from "../scenes/GardenScene";
import { ThemeScope, useTheme } from "../theme/ThemeProvider";

function ArcCard({ arc, active, onOpen }: { arc: Arc; active: boolean; onOpen: () => void }) {
  const state = useAppState();
  const today = useToday();
  const day = minDay(today, arcEnd(arc));
  const model = gardenFromState(state, arc, day < arc.startDate ? arc.startDate : day, NO_EVENTS);
  const status = arcStatus(state, arc, today);
  return (
    <ThemeScope look={arc.look} season={arc.season} data-testid="arc-card" data-arc-id={arc.id} data-status={status.kind}>
      <Card arc={arc} active={active} onOpen={onOpen} status={status} model={model} />
    </ThemeScope>
  );
}

function Card({ arc, active, onOpen, status, model }: { arc: Arc; active: boolean; onOpen: () => void; status: ReturnType<typeof arcStatus>; model: ReturnType<typeof gardenFromState> }) {
  const th = useTheme();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className="flex w-full flex-col overflow-hidden text-left"
      style={{
        borderRadius: 18,
        background: th.isNight ? "linear-gradient(180deg, #1C2119 0%, #151913 100%)" : `linear-gradient(180deg, ${th.t.base[0]} 0%, ${th.t.base[1]} 100%)`,
        boxShadow: active ? `0 0 0 2px ${th.accent}, ${th.card.shadow}` : `0 0 0 1px ${th.t.line}, ${th.card.shadow}`,
      }}
    >
      <GardenScene model={model} still testId="garden-mini" label={`${arc.name} garden`} />
      <span className="flex flex-col gap-1 p-3">
        <span className="truncate text-[17px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>{arc.name}</span>
        <span data-testid="arc-status" className="text-[13px]" style={{ color: th.t.muted }}>{status.label}</span>
        <span aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: th.progressTrack }}>
          <span className="block h-full rounded-full" style={{ width: `${Math.round(status.progress * 100)}%`, background: th.progressFill }} />
        </span>
      </span>
    </button>
  );
}

export default function Arcs() {
  const state = useAppState();
  const th = useTheme();
  const navigate = useNavigate();
  const arcs = state.arcs.filter((a) => !a.deleted).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex h-11 items-center">
        <h1 className="text-[30px] leading-none" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Your arcs</h1>
      </header>
      {arcs.length === 0 ? (
        <p data-testid="no-arcs" className="text-[15px]" style={{ color: th.t.muted }}>No arcs yet. Start one: pick a season, a length and the habits to grow.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {arcs.map((a) => (
            <ArcCard
              key={a.id}
              arc={a}
              active={a.id === state.activeArcId}
              onOpen={() => {
                actions.setActiveArc(a.id);
                navigate("/");
              }}
            />
          ))}
        </div>
      )}
      <Link to="/arcs/new" data-testid="start-arc" className="flex h-[52px] items-center justify-center rounded-2xl text-[16px] font-semibold" style={{ background: th.accentGradient, color: th.t.onAccent }}>
        Start a new arc
      </Link>
    </div>
  );
}
