type Props = { value: number; max: number; size?: number; stroke?: number; className?: string };

export default function ProgressRing({ value, max, size = 56, stroke = 5, className = "" }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const k = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - k)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 600ms ease-out" }}
      />
    </svg>
  );
}
