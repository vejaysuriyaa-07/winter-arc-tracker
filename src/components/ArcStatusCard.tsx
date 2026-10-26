import { useNavigate } from "react-router";

type Before = { kind: "before"; daysUntil: number };
type Complete = {
  kind: "complete";
  consistency: number | null;
  longestStreak: number;
  level: number;
};

export default function ArcStatusCard(props: Before | Complete) {
  const navigate = useNavigate();
  if (props.kind === "before") {
    return (
      <section className="card p-5 text-center" data-testid="arc-before">
        <p className="text-xs uppercase tracking-wide text-dim">Arc starts in</p>
        <p className="num mt-1 text-6xl font-bold text-green">{props.daysUntil}</p>
        <p className="text-sm text-muted">{props.daysUntil === 1 ? "day" : "days"}</p>
        <p className="mt-3 text-sm text-muted">Your habits are listed below as a preview. Check-offs open on day 1.</p>
      </section>
    );
  }
  return (
    <section className="card p-5" data-testid="arc-complete">
      <p className="num text-2xl font-bold uppercase tracking-wide text-gold">Arc complete</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-dim">Consistency</dt>
          <dd className="num text-3xl font-bold">
            {props.consistency === null ? "–" : `${Math.round(props.consistency)}%`}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-dim">Longest streak</dt>
          <dd className="num text-3xl font-bold">{props.longestStreak}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-dim">Level</dt>
          <dd className="num text-3xl font-bold">{props.level}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => navigate("/settings")}
        className="tap mt-5 w-full rounded-xl bg-green px-4 font-semibold text-bg"
      >
        Start a new arc
      </button>
    </section>
  );
}
