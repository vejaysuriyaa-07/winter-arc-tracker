// One habit: checkbox with the two-phase check animation (Skin.dc.html), name,
// detail, animated streak icon and number. Edit mode adds a drag handle and an X.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import type { Habit } from "../../types";
import type { IconSpec } from "../../lib/today-view";
import { useTheme } from "../../theme/ThemeProvider";
import StreakIcon from "./StreakIcon";

type Props = {
  habit: Habit;
  done: boolean;
  streak: number;
  icon: IconSpec;
  index: number;
  last: boolean;
  editing: boolean;
  disabled: boolean;
  motion: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onDragStart?: (e: RPointerEvent) => void;
};

const SPARKS = Array.from({ length: 7 }, (_, k) => {
  const a = (Math.PI * 2 * k) / 7 - Math.PI / 2;
  const dist = 20 + (k % 3) * 6;
  return { x: Math.round(Math.cos(a) * dist), y: Math.round(Math.sin(a) * dist) };
});

export default function HabitRow({ habit, done, streak, icon, index, last, editing, disabled, motion, onToggle, onRemove, onDragStart }: Props) {
  const th = useTheme();
  const [ph, setPh] = useState<0 | 1 | 2>(0);
  const [played, setPlayed] = useState(0); // how many check animations ran (a stable signal for tests)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raf = useRef(0);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      cancelAnimationFrame(raf.current);
    },
    [],
  );

  const toggle = (): void => {
    if (disabled) return;
    const checking = !done;
    onToggle();
    cancelAnimationFrame(raf.current);
    if (timer.current) clearTimeout(timer.current);
    if (!checking || !motion) {
      setPh(0);
      return;
    }
    // Phase 1 jumps everything to its start with no transition; phase 2 (two frames later) animates out.
    setPlayed((n) => n + 1);
    setPh(1);
    raf.current = requestAnimationFrame(() => {
      raf.current = requestAnimationFrame(() => setPh(2));
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPh(0), 950);
  };

  const row = th.row(done, last);
  const streakColor = icon.kind === "flame" ? th.fx.flameText : th.streakColor(done);
  return (
    <div
      className="relative flex items-stretch"
      style={{ background: row.background, boxShadow: row.shadow, borderRadius: row.radius, borderBottom: row.divider, transition: "box-shadow 300ms" }}
    >
      {editing && (
        <button
          type="button"
          aria-label={`Move ${habit.name}`}
          data-testid="drag-handle"
          onPointerDown={onDragStart}
          className="tap flex w-11 flex-none cursor-grab touch-none items-center justify-center"
          style={{ color: th.t.muted }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 9H19M5 15H19" />
          </svg>
        </button>
      )}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-disabled={disabled}
        aria-label={habit.detail ? `${habit.name}, ${habit.detail}` : habit.name}
        aria-describedby={editing ? undefined : `streak-${habit.id}`}
        data-testid="habit-row"
        data-habit-id={habit.id}
        data-anim-played={played}
        onClick={toggle}
        className="relative flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left text-base"
        style={{ padding: `6px ${editing ? 4 : th.listWrap.padR}px 6px ${editing ? 0 : th.listWrap.padL}px`, color: th.t.text, opacity: disabled ? 0.55 : 1, cursor: disabled ? "default" : "pointer" }}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit" }}>
          <span
            className="absolute inset-y-0 left-0 w-3/5"
            style={{ background: th.fx.sweep, opacity: ph === 0 ? 0 : 1, transform: `translateX(${ph === 2 ? 190 : -100}%)`, transition: ph === 2 ? "transform 750ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none" }}
          />
        </span>
        <span className="relative h-6 w-6 flex-none">
          <span
            aria-hidden="true"
            className="absolute -top-[7px] -left-[7px] h-[38px] w-[38px] rounded-full"
            style={{ border: `2px solid ${th.fx.ripple}`, opacity: ph === 1 ? 0.9 : 0, transform: `scale(${ph === 2 ? 2.3 : 0.55})`, transition: ph === 2 ? "transform 650ms ease-out, opacity 650ms ease-out" : "none" }}
          />
          {ph !== 0 &&
            SPARKS.map((s, k) => (
              <span
                key={k}
                data-testid="spark"
                aria-hidden="true"
                className="absolute top-[9px] left-[9px] h-1.5 w-1.5 rounded-full"
                style={{
                  background: th.fx.spark, boxShadow: th.fx.sparkGlow, opacity: ph === 1 ? 1 : 0,
                  transform: ph === 2 ? `translate(${s.x}px, ${s.y}px) scale(0.4)` : "translate(0, 0) scale(1)",
                  transition: ph === 2 ? "transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 700ms ease-out" : "none",
                }}
              />
            ))}
          <span
            className="relative flex h-6 w-6 items-center justify-center rounded-full"
            style={{ border: `1.5px solid ${th.checkRing(done)}`, background: th.checkFill(done), transform: `scale(${ph === 1 ? 0.55 : 1})`, transition: ph === 2 ? "transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)" : "none" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={th.t.onAccent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: done ? 1 : 0 }} aria-hidden="true">
              <path d="M5 12.5L9.5 17L19 7" />
            </svg>
          </span>
        </span>
        <span className="relative flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate font-medium">{habit.name}</span>
          {habit.detail && <span className="truncate text-[13px]" style={{ color: th.t.muted }}>{habit.detail}</span>}
        </span>
        {!editing && (
          <span className="relative flex items-center gap-[3px] text-[17px]" style={{ color: streakColor, fontFamily: th.t.fonts.display }}>
            <span
              className="inline-flex"
              style={{ transform: `scale(${ph === 2 ? 1.35 : 1}) rotate(${ph === 2 ? -12 : 0}deg)`, transformOrigin: "50% 90%", transition: ph === 2 ? "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)" : "transform 500ms ease-out" }}
            >
              <StreakIcon spec={icon} phase={index * 0.83} />
            </span>
            <span className="num" data-testid="streak" aria-hidden="true">{streak}</span>
            <span id={`streak-${habit.id}`} className="sr-only">{streak === 1 ? "1 day streak" : `${streak} day streak`}</span>
          </span>
        )}
      </button>
      {editing && (
        <button
          type="button"
          aria-label={`Remove ${habit.name}`}
          data-testid="remove-habit"
          onClick={onRemove}
          className="tap flex w-11 flex-none items-center justify-center"
          style={{ color: th.t.muted }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6L18 18M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
