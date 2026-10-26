import { motion } from "motion/react";
import type { Habit } from "../types";

type Props = { habit: Habit; checked: boolean; disabled?: boolean; onToggle: () => void };

export const CATEGORY_LABEL: Record<Habit["category"], string> = {
  morning: "Morning",
  body: "Body",
  mind: "Mind",
  discipline: "Discipline",
  custom: "Custom",
};

export default function HabitRow({ habit, checked, disabled = false, onToggle }: Props) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
        data-testid="habit-row"
        data-habit={habit.name}
        className={`card flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-60 ${
          checked ? "border-green/50 bg-card-2" : ""
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[15px] font-medium ${checked ? "text-muted line-through decoration-green/60" : ""}`}>
            {habit.name}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-dim">
            {habit.detail && <span className="truncate">{habit.detail}</span>}
            <span className="rounded-md border border-line px-1.5 py-px uppercase tracking-wide text-[10px]">
              {CATEGORY_LABEL[habit.category]}
            </span>
          </span>
        </span>
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={checked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          whileTap={{ scale: 0.85 }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
            checked ? "border-green bg-green text-bg shadow-glow" : "border-dim"
          }`}
        >
          {checked && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </motion.span>
      </button>
    </li>
  );
}
