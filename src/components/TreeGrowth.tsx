import { TREE_STAGES, treeStage, type TreeStage } from "../lib/stats";

type Props = { lifetime: number };

const G = "#22C55E";
const D = "#15803D";
const T = "#8B5A2B";
const GOLD = "#F5B83D";

function Art({ stage }: { stage: TreeStage["name"] }) {
  switch (stage) {
    case "seed":
      return (
        <g>
          <ellipse cx="60" cy="96" rx="34" ry="6" fill="#182019" />
          <path d="M52 92c0-8 4-14 8-14s8 6 8 14c0 4-4 6-8 6s-8-2-8-6z" fill={T} />
          <path d="M60 78c2 4 2 8 0 12" stroke="#5B3A1A" strokeWidth="1.5" fill="none" />
        </g>
      );
    case "sprout":
      return (
        <g>
          <ellipse cx="60" cy="96" rx="34" ry="6" fill="#182019" />
          <path d="M60 96V70" stroke={D} strokeWidth="3" strokeLinecap="round" />
          <path d="M60 78c-10-2-16-10-14-18 8 0 14 8 14 18z" fill={G} />
          <path d="M60 72c10-2 16-10 14-18-8 0-14 8-14 18z" fill={G} />
        </g>
      );
    case "sapling":
      return (
        <g>
          <ellipse cx="60" cy="96" rx="36" ry="6" fill="#182019" />
          <path d="M60 96V52" stroke={T} strokeWidth="4" strokeLinecap="round" />
          <path d="M60 70c-12-2-18-12-16-22 10 0 16 10 16 22z" fill={G} />
          <path d="M60 62c12-2 18-12 16-22-10 0-16 10-16 22z" fill={G} />
          <path d="M60 52c-8-4-10-12-6-18 6 2 8 10 6 18z" fill={D} />
        </g>
      );
    case "tree":
      return (
        <g>
          <ellipse cx="60" cy="96" rx="40" ry="6" fill="#182019" />
          <path d="M60 96V58" stroke={T} strokeWidth="6" strokeLinecap="round" />
          <path d="M60 64l-12-10M60 56l12-10" stroke={T} strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="40" r="22" fill={D} />
          <circle cx="44" cy="50" r="14" fill={G} />
          <circle cx="76" cy="48" r="15" fill={G} />
          <circle cx="60" cy="32" r="14" fill={G} />
        </g>
      );
    case "blooming":
      return (
        <g>
          <ellipse cx="60" cy="96" rx="42" ry="6" fill="#182019" />
          <path d="M60 96V56" stroke={T} strokeWidth="6" strokeLinecap="round" />
          <path d="M60 64l-14-12M60 54l14-12" stroke={T} strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="38" r="24" fill={D} />
          <circle cx="42" cy="50" r="15" fill={G} />
          <circle cx="78" cy="48" r="16" fill={G} />
          <circle cx="60" cy="28" r="15" fill={G} />
          {[
            [48, 30], [72, 26], [60, 46], [38, 56], [84, 54], [66, 36],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill={GOLD} />
          ))}
        </g>
      );
  }
}

export default function TreeGrowth({ lifetime }: Props) {
  const stage = treeStage(lifetime);
  const idx = TREE_STAGES.findIndex((s) => s.name === stage.name);
  const next = TREE_STAGES[idx + 1];
  return (
    <section className="card flex items-center gap-4 p-4" data-testid="tree" data-stage={stage.name}>
      <svg width="120" height="100" viewBox="0 0 120 100" aria-hidden="true" className="shrink-0">
        <Art stage={stage.name} />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-dim">Tree growth</p>
        <p className="num text-2xl font-bold capitalize">{stage.name}</p>
        <p className="num mt-1 text-xs text-muted">
          {lifetime} lifetime check-offs
          {next ? ` · ${next.min - lifetime} to ${next.name}` : " · fully grown"}
        </p>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {TREE_STAGES.map((s, i) => (
            <span key={s.name} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-green" : "bg-line"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
