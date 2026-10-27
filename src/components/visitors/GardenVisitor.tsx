// A visitor in the garden scene. A new arrival makes a short entrance once
// (ui.celebrated["visitor:<id>"]); later visits on full days just appear.
import { useEffect } from "react";
import type { VisitorFound } from "../../types";
import { actions } from "../../lib/store";
import VisitorArt from "./VisitorArt";

export default function GardenVisitor({ record, entrance, motion }: { record: VisitorFound; entrance: boolean; motion: boolean }) {
  const key = `visitor:${record.id}`;
  useEffect(() => {
    if (entrance && !motion) actions.markCelebrated(key); // nothing to watch: count it as seen
  }, [entrance, motion, key]);
  return (
    <div
      data-testid="garden-visitor"
      data-visitor={record.visitorId}
      data-entrance={entrance && motion ? "true" : "false"}
      onAnimationEnd={() => entrance && actions.markCelebrated(key)}
      style={{
        position: "absolute", left: 238, bottom: 52, width: 56, height: 56, pointerEvents: "none",
        animation: entrance && motion ? "visitor-in 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both" : "none",
        filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.18))",
      }}
    >
      <VisitorArt id={record.visitorId} size={56} />
    </div>
  );
}
