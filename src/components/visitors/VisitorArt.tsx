import { VISITOR_ART } from "../../art/visitors";
import { visitorById } from "../../lib/visitors";

/** A visitor in colour, or as a single dark silhouette while locked. */
export default function VisitorArt({ id, size = 64, locked = false, silhouette = "#1F2A40" }: { id: string; size?: number; locked?: boolean; silhouette?: string }) {
  const a = VISITOR_ART[id];
  const v = visitorById(id);
  if (!a) return null;
  return (
    <svg data-testid="visitor-art" data-visitor={id} data-locked={locked ? "true" : "false"} width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={locked ? `Locked visitor` : (v?.name ?? "Visitor")}>
      <path d={a.d1} fill={locked ? silhouette : a.c1} />
      <path d={a.d2} fill={locked ? silhouette : a.c2} />
      {!locked && <path d={a.d3} fill={a.c3} />}
    </svg>
  );
}
