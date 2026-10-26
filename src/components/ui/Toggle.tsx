import { useTheme } from "../../theme/ThemeProvider";

/** A 52x32 switch (ThemePicker.dc.html) inside a 44px-tall labelled row. */
export default function Toggle({ label, detail, checked, onChange, testId }: { label: string; detail?: string; checked: boolean; onChange: (v: boolean) => void; testId?: string }) {
  const th = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className="flex min-h-[52px] w-full items-center justify-between gap-3 text-left"
    >
      <span className="flex flex-col">
        <span className="text-[16px] font-medium">{label}</span>
        {detail && <span className="text-[13px]" style={{ color: th.t.muted }}>{detail}</span>}
      </span>
      <span aria-hidden="true" className="relative h-8 w-[52px] flex-none rounded-full" style={{ background: checked ? th.accentGradient : th.isNight ? "#2A3026" : th.t.line, transition: "background 200ms" }}>
        <span className="absolute top-[3px] h-[26px] w-[26px] rounded-full" style={{ left: checked ? 23 : 3, background: "#FFFFFF", boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)", transition: "left 200ms cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
      </span>
    </button>
  );
}
