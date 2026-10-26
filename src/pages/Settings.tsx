import { useEffect, useRef, useState, type ChangeEvent } from "react";
import ConfirmSheet from "../components/ConfirmSheet";
import { CATEGORY_LABEL } from "../components/HabitRow";
import ScoringSheet from "../components/ScoringSheet";
import { isValidYMD } from "../lib/dates";
import { isHardDeletable } from "../lib/mutations";
import { parseImport, serialize } from "../lib/storage";
import { actions, useAppState } from "../lib/store";
import { useToday } from "../lib/today";
import { CATEGORIES, type AppState, type Category, type Habit } from "../types";

type Confirm =
  | { kind: "delete"; habit: Habit }
  | { kind: "import"; state: AppState; habits: number; logs: number }
  | { kind: "reset" };

const field = "tap num w-full rounded-xl bg-bg px-3 text-base focus:outline-none focus:ring-2 focus:ring-green/60";
const label = "text-[11px] uppercase tracking-wide text-dim";

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (v: number) => void;
};

/** Number input with a local draft: commits a valid value on blur or Enter, so typing never snaps. */
function NumberField({ label, value, min, max, step = 1, onCommit }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit(): void {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    onCommit(Math.max(min, Math.min(max, n)));
  }
  return (
    <input
      type="number"
      inputMode={step < 1 ? "decimal" : "numeric"}
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      aria-label={label}
      className={`${field} mt-1`}
    />
  );
}

function HabitEditor({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const [name, setName] = useState(habit.name);
  const [detail, setDetail] = useState(habit.detail ?? "");
  const [category, setCategory] = useState<Category>(habit.category);
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        actions.editHabit(habit.id, { name, detail, category });
        onDone();
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Habit name" className="tap w-full rounded-xl bg-bg px-3 text-[15px]" />
      <input value={detail} onChange={(e) => setDetail(e.target.value)} aria-label="Habit detail" placeholder="Detail, e.g. 10 pages" className="tap w-full rounded-xl bg-bg px-3 text-[15px] placeholder:text-dim" />
      <div className="flex gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label="Habit category" className="tap flex-1 rounded-xl bg-bg px-2 text-sm">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <button type="button" onClick={onDone} className="tap rounded-xl border border-line px-4 text-sm text-muted">
          Cancel
        </button>
        <button type="submit" disabled={name.trim() === ""} className="tap rounded-xl bg-green px-4 text-sm font-semibold text-bg disabled:opacity-40">
          Save
        </button>
      </div>
    </form>
  );
}

export default function Settings() {
  const state = useAppState();
  const today = useToday();
  const { settings } = state;
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const active = state.habits.filter((h) => h.archivedAt === undefined).sort((a, b) => a.order - b.order);

  function exportJson(): void {
    const blob = new Blob([serialize(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `winter-arc-${today}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function onImportFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const r = parseImport(text);
    if (!r.ok) {
      setImportError(r.error);
      return;
    }
    setImportError(null);
    setConfirm({ kind: "import", state: r.state, habits: r.state.habits.length, logs: Object.keys(r.state.logs).length });
  }

  return (
    <main className="space-y-5">
      <h1 className="num text-2xl font-bold uppercase tracking-wider">Settings</h1>

      <section className="card space-y-3 p-4" aria-labelledby="arc-title">
        <h2 id="arc-title" className="num text-base font-bold uppercase tracking-wide text-muted">
          Arc
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={label}>Start date</span>
            <input
              type="date"
              value={settings.startDate}
              onChange={(e) => {
                if (isValidYMD(e.target.value)) actions.updateSettings({ startDate: e.target.value });
              }}
              aria-label="Arc start date"
              className={`${field} mt-1`}
            />
          </label>
          <label className="block">
            <span className={label}>Length (days)</span>
            <NumberField label="Arc length in days" value={settings.lengthDays} min={1} max={3650} onCommit={(v) => actions.updateSettings({ lengthDays: v })} />
          </label>
          <label className="block">
            <span className={label}>Streak threshold %</span>
            <NumberField label="Streak threshold percent" value={settings.streakThreshold} min={0} max={100} onCommit={(v) => actions.updateSettings({ streakThreshold: v })} />
          </label>
          <label className="block">
            <span className={label}>Sleep target (hours)</span>
            <NumberField label="Sleep target hours" value={settings.sleepTargetHours} min={0.5} max={24} step={0.5} onCommit={(v) => actions.updateSettings({ sleepTargetHours: v })} />
          </label>
        </div>
        <p className="text-xs text-dim">Moving the start date keeps your original habits scheduled from day 1.</p>
      </section>

      <section className="space-y-2" aria-labelledby="habits-title">
        <h2 id="habits-title" className="num text-base font-bold uppercase tracking-wide text-muted">
          Habits
        </h2>
        <ul className="space-y-2" data-testid="settings-habits">
          {active.map((h, i) => (
            <li key={h.id} className="card p-3" data-habit={h.name}>
              {editing === h.id ? (
                <HabitEditor habit={h} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium leading-tight break-words">{h.name}</p>
                    <p className="text-xs text-dim">
                      {h.detail ? `${h.detail} · ` : ""}
                      {CATEGORY_LABEL[h.category]}
                    </p>
                  </div>
                  <button type="button" onClick={() => actions.moveHabit(h.id, -1)} disabled={i === 0} aria-label={`Move ${h.name} up`} className="tap rounded-lg border border-line text-muted disabled:opacity-30">
                    ↑
                  </button>
                  <button type="button" onClick={() => actions.moveHabit(h.id, 1)} disabled={i === active.length - 1} aria-label={`Move ${h.name} down`} className="tap rounded-lg border border-line text-muted disabled:opacity-30">
                    ↓
                  </button>
                  <button type="button" onClick={() => setEditing(h.id)} aria-label={`Edit ${h.name}`} className="tap rounded-lg border border-line px-3 text-sm text-muted">
                    Edit
                  </button>
                  <button type="button" onClick={() => setConfirm({ kind: "delete", habit: h })} aria-label={`Delete ${h.name}`} className="tap rounded-lg border border-line px-2 text-red">
                    ✕
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {active.length === 0 && <p className="text-sm text-muted">No active habits. Add one from the Today screen.</p>}
      </section>

      <section className="card space-y-3 p-4" aria-labelledby="data-title">
        <h2 id="data-title" className="num text-base font-bold uppercase tracking-wide text-muted">
          Data
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={exportJson} className="tap rounded-xl border border-line font-semibold text-muted">
            Export JSON
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="tap rounded-xl border border-line font-semibold text-muted">
            Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImportFile} className="hidden" data-testid="import-file" />
        </div>
        {importError && (
          <p role="alert" className="rounded-xl border border-red/40 bg-red/10 px-3 py-2 text-sm text-red" data-testid="import-error">
            Import failed: {importError}
          </p>
        )}
        <button type="button" onClick={() => setConfirm({ kind: "reset" })} className="tap w-full rounded-xl border border-red/40 font-semibold text-red">
          Reset arc
        </button>
        <p className="text-xs text-dim">Reset clears every day log and starts a fresh arc today. Habits and goals stay.</p>
      </section>

      <button type="button" onClick={() => setScoring(true)} className="tap w-full rounded-xl border border-line font-semibold text-green">
        How scoring works
      </button>

      {scoring && <ScoringSheet settings={settings} onClose={() => setScoring(false)} />}

      {confirm?.kind === "delete" && (
        <ConfirmSheet
          title={`Delete "${confirm.habit.name}"?`}
          body={
            isHardDeletable(confirm.habit, today)
              ? "This habit has no past days, so it will be removed completely."
              : "Past days keep their percentages. The habit stops counting from today."
          }
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            actions.deleteHabit(today, confirm.habit.id);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "import" && (
        <ConfirmSheet
          title="Replace your data?"
          body={`The file holds ${confirm.habits} habits and ${confirm.logs} logged days. Everything currently stored will be replaced.`}
          confirmLabel="Replace"
          danger
          onConfirm={() => {
            actions.importState(confirm.state);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "reset" && (
        <ConfirmSheet
          title="Reset the arc?"
          body="All day logs will be cleared and the arc will start today. Habits and goals stay."
          confirmLabel="Reset"
          danger
          onConfirm={() => {
            actions.resetArc(today);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </main>
  );
}
