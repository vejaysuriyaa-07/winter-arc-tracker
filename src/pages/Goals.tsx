import { useState, type FormEvent } from "react";
import ConfirmSheet from "../components/ConfirmSheet";
import EmptyState from "../components/EmptyState";
import TreeGrowth from "../components/TreeGrowth";
import { lifetimeCheckoffs } from "../lib/stats";
import { actions, useAppState } from "../lib/store";
import { useToday } from "../lib/today";

export default function Goals() {
  const state = useAppState();
  const today = useToday();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = Number(target);
    if (name.trim() === "" || !Number.isFinite(t) || t <= 0) return;
    actions.addGoal(today, { name, target: t });
    setName("");
    setTarget("");
  }

  const pending = removing === null ? undefined : state.goals.find((g) => g.id === removing);

  return (
    <main className="space-y-4">
      <h1 className="num text-2xl font-bold uppercase tracking-wider">Goals</h1>

      <TreeGrowth lifetime={lifetimeCheckoffs(state)} />

      <section className="space-y-2" aria-label="Yearly goals">
        <h2 className="num text-base font-bold uppercase tracking-wide text-muted">Yearly goals</h2>
        {state.goals.length === 0 ? (
          <EmptyState title="No goals yet" hint="Add one below: a name and a target number, then count it up as you go." />
        ) : (
          <ul className="space-y-2" data-testid="goal-list">
            {state.goals.map((g) => {
              const k = g.target > 0 ? Math.min(1, g.current / g.target) : 0;
              const done = g.current >= g.target;
              return (
                <li key={g.id} className="card p-4" data-testid="goal" data-goal={g.name}>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{g.name}</p>
                      <p className="num text-xs text-muted">
                        <span data-testid="goal-current">{g.current}</span> / {g.target}
                        {done && <span className="ml-2 text-gold">reached</span>}
                      </p>
                    </div>
                    <button type="button" onClick={() => actions.incGoal(g.id, -1)} aria-label={`Decrease ${g.name}`} className="tap num rounded-xl border border-line text-xl text-muted">
                      −1
                    </button>
                    <button type="button" onClick={() => actions.incGoal(g.id, 1)} aria-label={`Increase ${g.name}`} className="tap num rounded-xl bg-green text-xl font-bold text-bg">
                      +1
                    </button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                    <div className={`h-full rounded-full ${done ? "bg-gold" : "bg-green"}`} style={{ width: `${k * 100}%`, transition: "width 300ms ease-out" }} />
                  </div>
                  <button type="button" onClick={() => setRemoving(g.id)} className="tap mt-1 -ml-2 px-2 text-xs text-dim">
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <form onSubmit={submit} className="card flex items-center gap-2 p-2" aria-label="Add goal">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goal, e.g. Books read" aria-label="Goal name" className="tap min-w-0 flex-1 rounded-xl bg-bg px-3 text-[15px] placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-green/60" />
          <input value={target} onChange={(e) => setTarget(e.target.value)} type="number" inputMode="numeric" min={1} placeholder="Target" aria-label="Target" className="tap num w-20 rounded-xl bg-bg px-2 text-[15px] placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-green/60" />
          <button type="submit" className="tap rounded-xl bg-green px-4 text-sm font-semibold text-bg disabled:opacity-40" disabled={name.trim() === "" || !(Number(target) > 0)}>
            Add
          </button>
        </form>
      </section>

      {pending && (
        <ConfirmSheet
          title="Remove goal?"
          body={`"${pending.name}" and its count will be removed.`}
          confirmLabel="Remove"
          danger
          onConfirm={() => {
            actions.removeGoal(pending.id);
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </main>
  );
}
