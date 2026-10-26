// Catmull-Rom to cubic bezier, for the hand-drawn SVG charts.
export type Pt = { x: number; y: number };

export function catmullRomPath(pts: readonly Pt[], tension = 0.5): string {
  if (pts.length === 0) return "";
  const first = pts[0]!;
  if (pts.length === 1) return `M${first.x},${first.y}`;
  let d = `M${first.x},${first.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x},${p2.y}`;
  }
  return d;
}
