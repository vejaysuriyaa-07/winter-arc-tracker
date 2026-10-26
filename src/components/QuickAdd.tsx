import { useState, type FormEvent } from "react";
import { CATEGORIES, type Category } from "../types";
import { CATEGORY_LABEL } from "./HabitRow";

type Props = { onAdd: (name: string, category: Category) => void };

export default function QuickAdd({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("custom");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim() === "") return;
    onAdd(name, category);
    setName("");
  }

  return (
    <form onSubmit={submit} className="card flex items-center gap-2 p-2" aria-label="Quick add habit">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New habit"
        aria-label="New habit name"
        className="tap min-w-0 flex-1 rounded-xl bg-bg px-3 text-[15px] placeholder:text-dim focus:outline-none focus:ring-2 focus:ring-green/60"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as Category)}
        aria-label="Category"
        className="tap rounded-xl bg-bg px-2 text-xs text-muted focus:outline-none"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABEL[c]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={name.trim() === ""}
        className="tap rounded-xl bg-green px-4 text-sm font-semibold text-bg disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}
