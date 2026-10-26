import { useAppState } from "../lib/store";
import { useToday } from "../lib/today";
import { arcDayNumber } from "../lib/stats";

export default function Garden() {
  const state = useAppState();
  const today = useToday();
  const arc = state.arcs.find((a) => a.id === state.activeArcId && !a.deleted);
  return (
    <>
      <header className="flex h-11 items-center justify-between">
        <span className="font-display text-2xl font-medium italic">Grove</span>
        {arc && <span data-testid="arc-name" className="text-[15px] font-medium">{arc.name}</span>}
      </header>
      {arc ? (
        <p data-testid="arc-day" className="mt-4 text-muted">Day {arcDayNumber(arc, today)} of {arc.lengthDays}</p>
      ) : (
        <p data-testid="empty-garden" className="mt-4 text-muted">Start your first arc to plant a garden.</p>
      )}
    </>
  );
}
