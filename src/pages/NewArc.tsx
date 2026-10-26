// New arc (SPEC 5.6, NewArc.dc.html). The whole screen restyles live in the chosen look and season.
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import type { Look, Season } from "../types";
import { actions, useAppState } from "../lib/store";
import { useToday } from "../lib/today";
import { activeArc, arcHabits } from "../lib/stats";
import { seasonForDay } from "../lib/arcs";
import { defaultArcName } from "../lib/mutations";
import { formatMonthDay, isValidYMD } from "../lib/dates";
import { previewModel } from "../lib/garden";
import { LookCards, SeasonCards } from "../components/theme/ThemeCards";
import GardenPreview from "../components/theme/GardenPreview";
import Toggle from "../components/ui/Toggle";
import { radioKeys } from "../components/ui/useRadioKeys";
import NightSky from "../scenes/NightSky";
import { ThemeScope, useTheme } from "../theme/ThemeProvider";

const LENGTH_OPTIONS: readonly (number | "custom")[] = [30, 60, 90, "custom"];
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });

function Label({ children }: { children: React.ReactNode }) {
  const th = useTheme();
  return <h2 className="text-[15px] font-semibold" style={{ color: th.t.muted }}>{children}</h2>;
}

function Form(props: { look: Look; season: Season; setLook: (l: Look) => void; setSeason: (s: Season) => void }) {
  const { look, season, setLook, setSeason } = props;
  const th = useTheme();
  const state = useAppState();
  const today = useToday();
  const navigate = useNavigate();
  const location = useLocation();
  const current = activeArc(state);
  const currentHabits = current ? arcHabits(state, current.id).filter((h) => h.archivedAt === undefined) : [];

  const [name, setName] = useState("");
  const [length, setLength] = useState<number | "custom">(90);
  const [custom, setCustom] = useState("45");
  const [start, setStart] = useState(today);
  // Left open past midnight: a start that slipped into the past moves to the new today.
  useEffect(() => {
    setStart((s) => (isValidYMD(s) && s < today ? today : s));
  }, [today]);
  const [bring, setBring] = useState(currentHabits.length > 0);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(currentHabits.map((h) => h.id)));
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const customDays = Number(custom);
  const customOk = custom !== "" && Number.isInteger(customDays) && customDays >= 1 && customDays <= 365;
  const lengthDays = length === "custom" ? (customOk ? customDays : 1) : length;
  const habits = [
    ...(bring ? currentHabits.filter((h) => picked.has(h.id)).map((h) => ({ name: h.name, ...(h.detail ? { detail: h.detail } : {}) })) : []),
    ...extra.map((n) => ({ name: n })),
  ];
  const startOk = isValidYMD(start) && start >= today;
  const canPlant = startOk && (length !== "custom" || customOk);

  const addExtra = (): void => {
    const n = draft.trim();
    if (!n) return;
    setExtra((x) => [...x, n]);
    setDraft("");
  };
  const lengthKeys = radioKeys(LENGTH_OPTIONS, length, setLength);
  const plant = (): void => {
    if (!canPlant) return;
    actions.createArc({ name, season, look, startDate: start, lengthDays, habits });
    navigate("/");
  };

  const fieldStyle = { padding: `0 ${th.input.padX}px`, borderBottom: th.input.underline, borderRadius: th.input.radius, background: th.input.background, color: th.t.text };
  const chip = (on: boolean): React.CSSProperties => ({
    borderRadius: 999,
    background: on ? th.accentGradient : th.isNight ? "#1A1E17" : th.t.surface,
    color: on ? th.t.onAccent : th.t.text,
    boxShadow: on ? "none" : `0 0 0 1px ${th.t.line}`,
  });
  const preview = useMemo(
    () => previewModel(state, undefined, startOk ? start : today, season, Math.max(1, habits.length)),
    [state, start, startOk, today, season, habits.length],
  );
  // A cleared or partial date falls back to today for the preview; the error line explains it.
  const shown = startOk ? start : today;
  const startDate = new Date(Number(shown.slice(0, 4)), Number(shown.slice(5, 7)) - 1, Number(shown.slice(8, 10)));

  return (
    <div className="relative z-10 mx-auto flex max-w-md flex-col gap-5 px-4 pb-10" style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
      <div className="grid grid-cols-[80px_1fr_80px] items-center">
        <button type="button" onClick={() => (location.key === "default" ? navigate("/arcs") : navigate(-1))} className="tap justify-self-start text-[15px]" style={{ color: th.t.muted }}>Cancel</button>
        <h1 className="text-center text-[24px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>New arc</h1>
        <span />
      </div>

      <GardenPreview look={look} season={season} height={250} model={preview} habits={habits.length ? habits.map((h) => h.name) : ["Your first habit"]} arcName={name.trim() || defaultArcName(season)} weekday={WEEKDAY.format(startDate)} date={MONTH_DAY.format(startDate)} />

      <label className="flex flex-col gap-2">
        <Label>Name</Label>
        <input aria-label="Arc name" value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultArcName(season)} className="h-12 text-[16px] outline-none" style={fieldStyle} />
      </label>

      <section className="flex flex-col gap-2.5">
        <Label>Garden theme</Label>
        <LookCards season={season} value={look} onChange={setLook} />
        <SeasonCards value={season} onChange={setSeason} />
      </section>

      <section className="flex flex-col gap-2.5">
        <Label>Length</Label>
        <div role="radiogroup" aria-label="Length" className="grid grid-cols-4 gap-2" onKeyDown={lengthKeys.onKeyDown}>
          {LENGTH_OPTIONS.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={length === l} tabIndex={lengthKeys.tabIndex(l)} onClick={() => setLength(l)} className="h-11 text-[15px] font-medium" style={chip(length === l)}>
              {l === "custom" ? "Custom" : `${l} days`}
            </button>
          ))}
        </div>
        {length === "custom" && (
          <label className="flex items-center gap-3">
            <input aria-label="Custom length in days" inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))} className="h-12 w-24 text-[16px] outline-none" style={fieldStyle} />
            <span style={{ color: customOk ? th.t.muted : "#F87171" }}>days (1 to 365)</span>
          </label>
        )}
      </section>

      <label className="flex flex-col gap-2">
        <Label>Starts</Label>
        <span className="flex items-center gap-3">
          <input type="date" aria-label="Start date" value={start} min={today} onChange={(e) => setStart(e.target.value)} className="h-12 flex-1 text-[16px] outline-none" style={fieldStyle} />
          <span className="text-[15px]" style={{ color: th.t.muted }}>{start === today ? `Today, ${formatMonthDay(today)}` : ""}</span>
        </span>
        {!startOk && <span className="text-[13px]" style={{ color: "#F87171" }}>Pick today or a later day.</span>}
      </label>

      <section className="flex flex-col gap-2.5">
        {current && currentHabits.length > 0 && (
          <>
            <Toggle label={`Bring habits from ${current.name}`} detail="Each one gets a fresh seed" checked={bring} onChange={setBring} testId="bring-habits" />
            {bring && (
              <div className="flex flex-wrap gap-2">
                {currentHabits.map((h) => {
                  const on = picked.has(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      aria-pressed={on}
                      data-testid="habit-chip"
                      onClick={() => setPicked((p) => { const n = new Set(p); if (n.has(h.id)) n.delete(h.id); else n.add(h.id); return n; })}
                      className="h-10 px-4 text-[14px] font-medium"
                      style={chip(on)}
                    >
                      {h.name}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
        {!current && <Label>Habits</Label>}
        <div className="flex flex-wrap gap-2">
          {extra.map((n, i) => (
            <button key={`${n}-${i}`} type="button" aria-label={`Remove ${n}`} onClick={() => setExtra((x) => x.filter((_, j) => j !== i))} className="h-10 px-4 text-[14px] font-medium" style={chip(true)}>
              {n} ×
            </button>
          ))}
        </div>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); addExtra(); }}>
          <input aria-label="Add a habit to this arc" placeholder="Add a habit" value={draft} onChange={(e) => setDraft(e.target.value)} className="h-11 min-w-0 flex-1 text-[15px] outline-none" style={{ ...fieldStyle, borderRadius: 999, border: `1px dashed ${th.t.line}`, borderBottom: `1px dashed ${th.t.line}` }} />
          <button type="submit" aria-label="Add habit" className="flex h-11 w-11 flex-none items-center justify-center rounded-full" style={{ background: th.input.buttonBackground, color: th.input.buttonColor }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5V19M5 12H19" /></svg>
          </button>
        </form>
      </section>

      <button type="button" onClick={plant} disabled={!canPlant} data-testid="plant-arc" className="h-14 rounded-2xl text-[17px] font-semibold disabled:opacity-50" style={{ background: th.accentGradient, color: th.t.onAccent, boxShadow: `0 12px 22px -14px ${th.accent}` }}>
        Plant this arc
      </button>
    </div>
  );
}

export default function NewArc() {
  const state = useAppState();
  const today = useToday();
  const current = activeArc(state);
  const [look, setLook] = useState<Look>(current?.look ?? "journal");
  const [season, setSeason] = useState<Season>(() => seasonForDay(today));
  return (
    <ThemeScope look={look} season={season} paint className="relative min-h-dvh" data-testid="new-arc">
      <Sky look={look} />
      <Form look={look} season={season} setLook={setLook} setSeason={setSeason} />
    </ThemeScope>
  );
}

function Sky({ look }: { look: Look }) {
  const th = useTheme();
  return look === "night" ? <NightSky accent={th.accent} progress={0.2} /> : null;
}
