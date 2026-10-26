type Props = { streak: number };

export default function StreakFlame({ streak }: Props) {
  const lit = streak > 0;
  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-line bg-card px-3 py-1.5 ${
        lit ? "text-gold" : "text-dim"
      }`}
      aria-label={`Current streak ${streak} days`}
      data-testid="streak"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2 .8-3.5 2-4.6-.1 1.8.8 2.6 1.6 2.6 1.2 0 1.6-1.4 1.4-3C12.6 6.3 11 5 12 2z" />
      </svg>
      <span className="num text-lg font-bold leading-none">{streak}</span>
    </div>
  );
}
