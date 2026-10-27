// Visitor art: flat 64x64 SVG, three paths, at most three colours (SPEC 7.3).
// Winter is ported from docs/design/Visitors.dc.html; the other seasons are drawn
// in the same style. Locked visitors render d1 and d2 as one dark silhouette.
export type Art = { d1: string; d2: string; d3: string; c1: string; c2: string; c3: string };

const NONE = "M0 0";
const circle = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
const eye = (x: number, y: number, r = 1.6): string => circle(x, y, r);

// ---------- shapes shared across seasons ----------

const BIRD = {
  d1: "M14 38C14 26 24 20 34 20C44 20 52 28 50 38C48 48 40 52 30 52C20 52 14 46 14 38ZM14 40L4 46L14 46Z",
  d2: "M18 38C18 32 24 28 30 30C34 32 36 38 34 44C32 49 24 50 20 46C18 44 18 41 18 38Z",
  d3: "M50 34L58 36L50 38ZM40 30A2 2 0 1 0 44 30A2 2 0 1 0 40 30Z",
};
const RABBIT_D1 = "M16 46C16 34 26 28 36 30C46 32 50 40 48 48C46 54 38 56 30 56C20 56 16 52 16 46ZM31 28A9 9 0 1 0 49 28A9 9 0 1 0 31 28ZM36 20C34 10 36 4 38 4C40 4 41 12 40 20ZM43 20C44 10 47 5 49 6C51 7 48 14 46 21ZM12 44A4 4 0 1 0 20 44A4 4 0 1 0 12 44Z";
const SQUIRREL = {
  d1: "M20 52C6 48 4 30 12 20C18 13 30 16 29 26C28 33 21 34 20 30C24 34 22 44 26 50ZM26 50C26 40 32 34 40 34C48 34 52 42 50 50C48 56 30 56 26 50ZM38 34A8 8 0 1 0 54 34A8 8 0 1 0 38 34ZM48 26L50 20L53 27Z",
  d2: "M40 48C40 43 44 40 47 42C49 46 46 52 42 52C40 52 40 50 40 48Z",
  d3: "M48 33A1.6 1.6 0 1 0 51.2 33A1.6 1.6 0 1 0 48 33Z",
};
const FOX = {
  d1: "M14 46C14 36 24 32 34 34C44 36 48 42 46 50C44 54 20 56 14 46ZM38 22L42 14L46 22L54 30L44 38L36 32ZM14 44C6 40 4 30 10 26C10 34 14 38 20 40Z",
  d2: "M8 28C6 30 6 33 8 35C9 31 10 29 8 28ZM44 34L54 30L46 38Z",
  d3: "M44 27A1.5 1.5 0 1 0 47 27A1.5 1.5 0 1 0 44 27Z",
};
const DEER = {
  d1: "M14 44C14 36 22 32 32 32H44C50 32 52 38 50 44C48 48 18 50 14 44ZM44 34L48 18L56 20L52 36ZM18 46H21V58H18ZM26 46H29V58H26ZM40 46H43V58H40ZM46 46H49V58H46Z",
  d2: "M47 18L45 8L46.5 8L48.5 17ZM50 17L53 9L54.5 9.5L51.5 18Z",
  d3: "M50 23A1.3 1.3 0 1 0 52.6 23A1.3 1.3 0 1 0 50 23Z",
};
const OWL = {
  d1: "M18 52C14 40 16 24 32 20C48 24 50 40 46 52C40 58 24 58 18 52ZM20 22L22 14L27 20ZM44 22L42 14L37 20Z",
  d2: "M24 40H27V42H24ZM34 44H37V46H34ZM28 48H31V50H28ZM38 38H41V40H38Z",
  d3: "M24 30A4 4 0 1 0 32 30A4 4 0 1 0 24 30ZM32 30A4 4 0 1 0 40 30A4 4 0 1 0 32 30Z",
};
const BUTTERFLY = {
  d1: "M32 30C24 14 8 12 8 24C8 32 18 36 30 34C18 38 12 46 16 52C20 56 28 50 32 40C36 50 44 56 48 52C52 46 46 38 34 34C46 36 56 32 56 24C56 12 40 14 32 30Z",
  d2: `${circle(19, 23, 4)}${circle(45, 23, 4)}${circle(22, 46, 2.5)}${circle(42, 46, 2.5)}`,
  d3: "M30.5 24H33.5V46H30.5ZM31 25L26 15L27.5 14.5L32 24ZM33 25L38 15L36.5 14.5L32 24Z",
};
const HEDGEHOG = {
  d1: "M10 46C10 34 18 26 30 24L34 18L37 24L42 20L43 27L49 25L48 31L54 32L50 36C54 40 54 46 50 48H12C10 48 10 47 10 46Z",
  d2: "M44 36C50 36 58 40 58 44C58 46 54 48 48 48H44ZM16 48H20V52H16ZM38 48H42V52H38Z",
  d3: `${eye(50, 40, 1.5)}${circle(58.5, 43.5, 1.5)}`,
};

/** Petals scattered at seeded spots (Blossom rain). */
function petals(seed: number, n: number, size: number): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = 6 + ((Math.sin((i + seed) * 12.9898) * 43758.5453) % 1 + 1) % 1 * 52;
    const y = 6 + ((Math.sin((i + seed) * 78.233) * 12345.678) % 1 + 1) % 1 * 52;
    const s = size;
    out += `M${x.toFixed(1)} ${y.toFixed(1)}C${(x - s).toFixed(1)} ${(y - s).toFixed(1)} ${(x - s / 3).toFixed(1)} ${(y - 2 * s).toFixed(1)} ${x.toFixed(1)} ${(y - s * 1.2).toFixed(1)}C${(x + s / 3).toFixed(1)} ${(y - 2 * s).toFixed(1)} ${(x + s).toFixed(1)} ${(y - s).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}Z`;
  }
  return out;
}

/** A goose in flight: body and wings as one shape. */
function goose(x: number, y: number): string {
  return `M${x} ${y}L${x + 7} ${y - 4}L${x + 9} ${y - 1}L${x + 14} ${y - 2}L${x + 10} ${y + 1}L${x + 12} ${y + 5}L${x + 7} ${y + 2}Z`;
}

export const VISITOR_ART: Record<string, Art> = {
  // ---------- winter (Visitors.dc.html) ----------
  "winter-robin": { ...BIRD, c1: "#6B5B4D", c2: "#F97316", c3: "#0F172A" },
  "winter-cardinal": {
    d1: "M14 40C14 28 24 22 34 22C44 22 52 30 50 40C48 50 40 54 30 54C20 54 14 48 14 40ZM14 42L4 48L14 48ZM36 22L40 8L45 23Z",
    d2: "M43 27C48 27 52 31 52 35L44 37Z",
    d3: "M52 34L60 36L52 38Z",
    c1: "#DC2626", c2: "#111827", c3: "#F59E0B",
  },
  "winter-rabbit": { d1: RABBIT_D1, d2: "M37 18C36 11 37 7 38 7C39 7 39 13 39 18Z", d3: "M42 27A1.6 1.6 0 1 0 45.2 27A1.6 1.6 0 1 0 42 27Z", c1: "#E5E7EB", c2: "#F9A8D4", c3: "#0F172A" },
  "winter-squirrel": { ...SQUIRREL, c1: "#B45309", c2: "#FDE68A", c3: "#0F172A" },
  "winter-red-fox": { ...FOX, c1: "#EA580C", c2: "#FFF7ED", c3: "#0F172A" },
  "winter-deer": { ...DEER, c1: "#A16207", c2: "#78350F", c3: "#0F172A" },
  "winter-snowy-owl": { ...OWL, c1: "#F8FAFC", c2: "#94A3B8", c3: "#FACC15" },
  "winter-northern-lights": {
    d1: "M6 40C16 26 26 34 36 22C44 14 52 18 58 12V30C50 34 44 30 36 38C26 46 16 40 6 52Z",
    d2: "M6 52C16 40 26 46 36 38C44 30 50 34 58 30V44C50 46 42 44 34 50C24 56 16 52 6 58Z",
    d3: "M12.5 14A1.5 1.5 0 1 0 15.5 14A1.5 1.5 0 1 0 12.5 14ZM26.8 10A1.2 1.2 0 1 0 29.2 10A1.2 1.2 0 1 0 26.8 10ZM44.6 24A1.4 1.4 0 1 0 47.4 24A1.4 1.4 0 1 0 44.6 24Z",
    c1: "#34D399", c2: "#A78BFA", c3: "#F8FAFC",
  },
  "winter-shooting-star": { d1: "M44 14L47 22L56 23L49 28L51 37L44 32L37 37L39 28L32 23L41 22Z", d2: "M6 54L36 28L38 31L9 56Z", d3: NONE, c1: "#FDE68A", c2: "#F59E0B", c3: "#000000" },

  // ---------- spring ----------
  "spring-bee": {
    d1: "M16 38C16 30 24 26 34 26C46 26 52 32 52 38C52 44 46 50 34 50C24 50 16 46 16 38Z",
    d2: "M26 27H31V49H26ZM37 26H42V50H37ZM50 34C54 34 58 36 58 38C58 40 54 42 50 42ZM16 38L8 36L8 40Z",
    d3: "M28 26C24 14 32 10 36 16C38 20 36 24 33 26ZM37 26C39 14 49 12 51 18C52 22 47 26 41 27Z",
    c1: "#FACC15", c2: "#1F2937", c3: "#E0F2FE",
  },
  "spring-butterfly": { ...BUTTERFLY, c1: "#F472B6", c2: "#FDF2F8", c3: "#4C1D95" },
  "spring-songbird": { ...BIRD, c1: "#60A5FA", c2: "#FDE68A", c3: "#0F172A" },
  "spring-hedgehog": { ...HEDGEHOG, c1: "#78716C", c2: "#FDE68A", c3: "#0F172A" },
  "spring-fawn": {
    d1: DEER.d1,
    d2: `${circle(22, 38, 2)}${circle(30, 36, 2)}${circle(38, 40, 2)}${circle(27, 43, 1.6)}`,
    d3: DEER.d3,
    c1: "#C2853D", c2: "#FFF7ED", c3: "#0F172A",
  },
  "spring-swan": {
    d1: "M8 44C8 38 16 34 26 36C32 37 36 40 40 40C42 32 38 26 40 18C42 12 50 12 50 18C50 22 46 24 46 30C46 36 48 42 46 46C42 52 16 54 8 44Z",
    d2: "M50 16L58 19L50 21ZM4 54H60V56.5H4Z",
    d3: eye(46.8, 16, 1.3),
    c1: "#F8FAFC", c2: "#F97316", c3: "#0F172A",
  },
  "spring-rabbit-family": {
    d1: `${RABBIT_D1}M2 56C2 51 6 48 10 49C14 50 15 53 14 56C13 59 4 60 2 56ZM6 47A4 4 0 1 0 14 47A4 4 0 1 0 6 47ZM8 43C7 38 8 35 9 35C10 35 10 39 10 43ZM11 43C12 38 13 36 14 37C15 38 14 41 13 44Z`,
    d2: "M37 18C36 11 37 7 38 7C39 7 39 13 39 18Z",
    d3: `${eye(43.6, 27)}${eye(12, 46, 1)}`,
    c1: "#D6D3D1", c2: "#F9A8D4", c3: "#0F172A",
  },
  "spring-blossom-rain": { d1: petals(1, 9, 4), d2: petals(20, 7, 3), d3: petals(40, 6, 2.2), c1: "#F9A8D4", c2: "#FBCFE8", c3: "#FFFFFF" },
  "spring-rainbow-moth": { ...BUTTERFLY, c1: "#C084FC", c2: "#FDE68A", c3: "#38BDF8" },

  // ---------- summer ----------
  "summer-ladybug": {
    d1: "M12 40C12 28 21 22 32 22C43 22 52 28 52 40C52 50 43 56 32 56C21 56 12 50 12 40Z",
    d2: `M31 22H33V56H31ZM24 22C24 14 40 14 40 22Z${circle(22, 34, 3)}${circle(42, 34, 3)}${circle(23, 46, 2.6)}${circle(41, 46, 2.6)}M18 40L10 44L11 46L19 42ZM46 40L54 44L53 46L45 42Z`,
    d3: `${eye(28, 18, 1.4)}${eye(36, 18, 1.4)}`,
    c1: "#DC2626", c2: "#111827", c3: "#F8FAFC",
  },
  "summer-dragonfly": {
    d1: `M30.5 22H33.5V58H30.5Z${circle(32, 18, 5)}`,
    d2: "M30 26C20 18 6 18 6 24C6 28 18 30 30 29ZM34 26C44 18 58 18 58 24C58 28 46 30 34 29ZM30 32C22 30 10 32 10 36C10 40 22 38 30 35ZM34 32C42 30 54 32 54 36C54 40 42 38 34 35Z",
    d3: `${eye(29, 16, 1.8)}${eye(35, 16, 1.8)}`,
    c1: "#0EA5E9", c2: "#BAE6FD", c3: "#0F172A",
  },
  "summer-frog": {
    d1: `M10 50C8 38 18 30 32 30C46 30 56 38 54 50C52 56 12 56 10 50Z${circle(23, 30, 7)}${circle(41, 30, 7)}M8 52L2 58H14ZM56 52L62 58H50Z`,
    d2: "M20 46C20 42 26 40 32 40C38 40 44 42 44 46C44 50 38 52 32 52C26 52 20 50 20 46Z",
    d3: `${circle(23, 29, 3)}${circle(41, 29, 3)}M24 40Q32 44 40 40L40 41.5Q32 45.5 24 41.5Z`,
    c1: "#16A34A", c2: "#BBF7D0", c3: "#0F172A",
  },
  "summer-hummingbird": {
    d1: "M14 40C14 30 24 24 34 26C42 28 46 34 44 40C42 46 34 50 26 50C18 50 14 46 14 40ZM16 44L4 54L8 56L18 48Z",
    d2: "M22 34C24 20 34 10 46 12C42 22 34 30 24 38Z",
    d3: `M44 32L62 30L44 35Z${eye(38.5, 31, 1.5)}`,
    c1: "#10B981", c2: "#A7F3D0", c3: "#0F172A",
  },
  "summer-turtle": {
    d1: "M12 44C12 30 22 22 32 22C42 22 52 30 52 44Z",
    d2: "M50 40C54 36 60 38 60 42C60 46 54 46 50 44ZM14 44L10 51H19ZM24 44L22 51H30ZM36 44L34 51H42ZM46 44L44 51H52ZM10 42H54V45H10Z",
    d3: `M26 30L32 26L38 30L38 37L32 41L26 37ZM18 38L22 33L24 38ZM46 38L42 33L40 38Z${eye(56, 41, 1.2)}`,
    c1: "#65A30D", c2: "#A3E635", c3: "#365314",
  },
  "summer-heron": {
    d1: "M18 32C24 24 38 26 40 34C42 40 34 44 26 44C18 44 12 40 18 32ZM36 30C34 22 36 14 42 12C46 11 48 14 46 16C42 18 40 24 41 32Z",
    d2: "M26 44H28V60H26ZM32 44H34V60H32ZM46 13L60 15L46 16.5ZM24 60H30V61.5H24ZM30 60H36V61.5H30Z",
    d3: `${eye(43.5, 13.5, 1.2)}M40 12L32 10L40 14Z`,
    c1: "#94A3B8", c2: "#F59E0B", c3: "#0F172A",
  },
  "summer-fireflies": {
    d1: `${circle(16, 20, 7)}${circle(44, 14, 6)}${circle(50, 42, 7)}${circle(22, 48, 6)}${circle(34, 32, 5)}`,
    d2: `${circle(16, 17, 2.2)}${circle(44, 12.5, 1.9)}${circle(50, 39, 2.2)}${circle(22, 46.5, 1.9)}${circle(34, 30.5, 1.7)}`,
    d3: `${circle(16, 22, 2.4)}${circle(44, 15.5, 2)}${circle(50, 44, 2.4)}${circle(22, 49.5, 2)}${circle(34, 33.5, 1.8)}`,
    c1: "#FEF3C7", c2: "#1F2937", c3: "#FACC15",
  },
  "summer-meteor-shower": {
    d1: "M6 30L30 14L31 16L8 32ZM14 52L44 30L45 32.5L16 54ZM34 58L58 40L59 42L36 60Z",
    d2: `${circle(31, 14, 3)}${circle(45, 30.5, 3.5)}${circle(59, 40.5, 3)}`,
    d3: `${circle(10, 10, 1.2)}${circle(52, 12, 1.4)}${circle(24, 36, 1)}${circle(56, 24, 1)}`,
    c1: "#FDE68A", c2: "#FFFFFF", c3: "#C4B5FD",
  },
  "summer-golden-butterfly": { ...BUTTERFLY, c1: "#F59E0B", c2: "#FEF3C7", c3: "#78350F" },

  // ---------- autumn ----------
  "autumn-squirrel": { ...SQUIRREL, c1: "#9A3412", c2: "#FDBA74", c3: "#0F172A" },
  "autumn-hedgehog": { ...HEDGEHOG, c1: "#57534E", c2: "#FCD9B6", c3: "#0F172A" },
  "autumn-crow": { d1: BIRD.d1, d2: BIRD.d2, d3: BIRD.d3, c1: "#1F2937", c2: "#374151", c3: "#F59E0B" },
  "autumn-owl": { ...OWL, c1: "#92400E", c2: "#FDE68A", c3: "#F59E0B" },
  "autumn-fox": { ...FOX, c1: "#C2410C", c2: "#FFEDD5", c3: "#0F172A" },
  "autumn-elk": {
    d1: DEER.d1,
    d2: "M47 18L43 6L45 5.5L47.5 12L49 4L51 4.5L49.5 17ZM51 17L56 8L58 9L55 14L60 12L60.5 14L53.5 18Z",
    d3: DEER.d3,
    c1: "#78350F", c2: "#D6D3D1", c3: "#0F172A",
  },
  "autumn-geese": {
    d1: `${goose(8, 40)}${goose(20, 30)}${goose(32, 20)}${goose(20, 50)}${goose(32, 58)}`,
    d2: "M22 40L24 38L25 40ZM34 30L36 28L37 30ZM46 20L48 18L49 20ZM34 50L36 48L37 50ZM46 58L48 56L49 58Z",
    d3: NONE,
    c1: "#57534E", c2: "#111827", c3: "#000000",
  },
  "autumn-harvest-moon": {
    d1: circle(32, 28, 20),
    d2: `${circle(24, 22, 3.5)}${circle(38, 32, 4.5)}${circle(30, 38, 2.2)}${circle(40, 18, 2)}`,
    d3: "M4 46C12 40 22 44 28 42C36 40 44 44 60 40V46C46 50 36 46 28 48C20 50 12 46 4 52ZM10 56C20 52 34 58 52 54V57C36 60 22 56 10 59Z",
    c1: "#F59E0B", c2: "#D97706", c3: "#7C2D12",
  },
  "autumn-white-deer": { ...DEER, c1: "#F8FAFC", c2: "#E5E7EB", c3: "#0F172A" },
};
