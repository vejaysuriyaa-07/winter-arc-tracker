// Local calendar-day helpers. A day is a "YYYY-MM-DD" string in the device's
// local zone. All arithmetic goes through `new Date(y, m, d)` so DST shifts and
// UTC offsets never move a day. Never use toISOString() or new Date("YYYY-MM-DD").

export type YMD = string;
export type YearMonth = { year: number; month: number }; // month is 1-12

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatLocal(d: Date): YMD {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayLocal(now: Date = new Date()): YMD {
  return formatLocal(now);
}

function parts(ymd: YMD): [number, number, number] {
  const m = YMD_RE.exec(ymd);
  if (!m) throw new Error(`Not a YYYY-MM-DD day: ${ymd}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Local midnight of the given day. */
export function parseLocal(ymd: YMD): Date {
  const [y, m, d] = parts(ymd);
  return new Date(y, m - 1, d);
}

export function isValidYMD(s: unknown): s is YMD {
  if (typeof s !== "string" || !YMD_RE.test(s)) return false;
  const [y, m, d] = parts(s);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function addDays(ymd: YMD, n: number): YMD {
  const [y, m, d] = parts(ymd);
  return formatLocal(new Date(y, m - 1, d + n));
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: YMD, b: YMD): number {
  const [ya, ma, da] = parts(a);
  const [yb, mb, db] = parts(b);
  const ms = Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da);
  return Math.round(ms / 86_400_000);
}

export function compareDays(a: YMD, b: YMD): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minDay(a: YMD, b: YMD): YMD {
  return a < b ? a : b;
}

export function maxDay(a: YMD, b: YMD): YMD {
  return a > b ? a : b;
}

/** Monday = 0 ... Sunday = 6. */
export function weekdayMonFirst(ymd: YMD): number {
  return (parseLocal(ymd).getDay() + 6) % 7;
}

export function startOfWeekMon(ymd: YMD): YMD {
  return addDays(ymd, -weekdayMonFirst(ymd));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function dayOfMonth(ymd: YMD): number {
  return parts(ymd)[2];
}

export function monthOf(ymd: YMD): YearMonth {
  const [year, month] = parts(ymd);
  return { year, month };
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const idx = ym.year * 12 + (ym.month - 1) + n;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function firstOfMonth(ym: YearMonth): YMD {
  return `${ym.year}-${pad2(ym.month)}-01`;
}

export function lastOfMonth(ym: YearMonth): YMD {
  return `${ym.year}-${pad2(ym.month)}-${pad2(daysInMonth(ym.year, ym.month))}`;
}

/** Inclusive list of days from a to b. Empty when b < a. */
export function eachDay(a: YMD, b: YMD): YMD[] {
  const out: YMD[] = [];
  const n = diffDays(a, b);
  for (let i = 0; i <= n; i++) out.push(addDays(a, i));
  return out;
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function weekdayShort(ymd: YMD): string {
  return WEEKDAY_SHORT[weekdayMonFirst(ymd)] ?? "";
}

/** e.g. "Sat, Oct 25" */
export function formatShort(ymd: YMD): string {
  const [, m, d] = parts(ymd);
  return `${weekdayShort(ymd)}, ${MONTH_SHORT[m - 1]} ${d}`;
}

/** e.g. "Oct 25" */
export function formatMonthDay(ymd: YMD): string {
  const [, m, d] = parts(ymd);
  return `${MONTH_SHORT[m - 1]} ${d}`;
}

/** e.g. "October 2026" */
export function formatMonthYear(ym: YearMonth): string {
  return `${MONTH_LONG[ym.month - 1]} ${ym.year}`;
}
