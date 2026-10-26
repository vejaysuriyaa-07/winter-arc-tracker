import { useState } from "react";
import { useTheme } from "../../theme/ThemeProvider";

export default function QuickAdd({ onAdd }: { onAdd: (name: string) => void }) {
  const th = useTheme();
  const i = th.input;
  const [name, setName] = useState("");
  const submit = (): void => {
    if (!name.trim()) return;
    onAdd(name);
    setName("");
  };
  return (
    <form
      className="mt-0.5 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        type="text"
        aria-label="New habit name"
        placeholder="Add a habit"
        value={name}
        onChange={(e) => setName(e.target.value)}
        enterKeyHint="done"
        className="h-12 min-w-0 flex-1 text-[15px] outline-none placeholder:opacity-70"
        style={{ padding: `0 ${i.padX}px`, borderBottom: i.underline, borderRadius: i.radius, background: i.background, color: th.t.text }}
      />
      <button
        type="submit"
        aria-label="Add habit"
        className="flex h-12 w-12 flex-none items-center justify-center"
        style={{ borderRadius: i.radius, background: i.buttonBackground, color: i.buttonColor, boxShadow: i.buttonShadow }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5V19M5 12H19" />
        </svg>
      </button>
    </form>
  );
}
