type Props = { title: string; hint: string; testId?: string };

export default function EmptyState({ title, hint, testId = "empty-state" }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-5 text-center" data-testid={testId}>
      <p className="text-sm font-medium text-muted">{title}</p>
      <p className="mt-1 text-xs text-dim">{hint}</p>
    </div>
  );
}
