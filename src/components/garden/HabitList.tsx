// The habit list in the look's list style. In edit mode rows reorder by dragging the handle.
import { Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState, type ReactElement } from "react";
import type { HabitRowView } from "../../lib/today-view";
import { useTheme } from "../../theme/ThemeProvider";

type RenderRow = (row: HabitRowView, index: number, last: boolean, dragStart?: (e: React.PointerEvent) => void) => ReactElement;

function DraggableRow({ row, index, last, render, onDrop }: { row: HabitRowView; index: number; last: boolean; render: RenderRow; onDrop: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={row.habit.id} dragListener={false} dragControls={controls} onDragEnd={onDrop} style={{ position: "relative" }}>
      {render(row, index, last, (e) => controls.start(e))}
    </Reorder.Item>
  );
}

export default function HabitList({ rows, editing, render, onReorder }: { rows: HabitRowView[]; editing: boolean; render: RenderRow; onReorder: (ids: string[]) => void }) {
  const th = useTheme();
  const w = th.listWrap;
  const ids = rows.map((r) => r.habit.id);
  const [order, setOrder] = useState(ids);
  // The drop handler reads the latest order from a ref: the drag may have started on an older render.
  const latest = useRef(order);
  latest.current = order;
  const key = ids.join(",");
  useEffect(() => setOrder(key ? key.split(",") : []), [key]);
  const byId = new Map(rows.map((r) => [r.habit.id, r]));
  const style = { gap: w.gap, background: w.background, borderRadius: w.radius, borderTop: w.borderTop, boxShadow: w.shadow };

  if (!editing) {
    return (
      <div data-testid="habit-list" className="flex flex-col" style={style}>
        {rows.map((r, i) => (
          <div key={r.habit.id}>{render(r, i, i === rows.length - 1)}</div>
        ))}
      </div>
    );
  }
  const shown = order.map((id) => byId.get(id)).filter((r): r is HabitRowView => r !== undefined);
  return (
    <Reorder.Group axis="y" values={order} onReorder={setOrder} data-testid="habit-list" className="flex flex-col" style={style}>
      {shown.map((r, i) => (
        <DraggableRow key={r.habit.id} row={r} index={i} last={i === shown.length - 1} render={render} onDrop={() => onReorder(latest.current)} />
      ))}
    </Reorder.Group>
  );
}
