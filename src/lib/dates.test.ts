import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  compareDays,
  daysInMonth,
  diffDays,
  formatLocal,
  isValidYMD,
  monthOf,
  parseLocal,
  startOfWeekMon,
  todayLocal,
  weekdayMonFirst,
} from "./dates";

// test/setup.ts pins TZ to America/Los_Angeles.

describe("todayLocal", () => {
  it("uses the local calendar day, not UTC", () => {
    // 23:30 local on Jan 31 is already Feb 1 in UTC.
    expect(todayLocal(new Date(2026, 0, 31, 23, 30))).toBe("2026-01-31");
    // 00:30 local on Jan 1 is still Dec 31 in UTC.
    expect(todayLocal(new Date(2027, 0, 1, 0, 30))).toBe("2027-01-01");
  });
});

describe("parseLocal / formatLocal", () => {
  it("round-trips at local midnight", () => {
    const d = parseLocal("2026-02-28");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(28);
    expect(d.getHours()).toBe(0);
    expect(formatLocal(d)).toBe("2026-02-28");
  });
  it("zero-pads month and day", () => {
    expect(formatLocal(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("is unaffected by DST change days", () => {
    // Spring forward (2026-03-08) and fall back (2026-11-01) in Los Angeles.
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDays("2026-11-02", -1)).toBe("2026-11-01");
  });
  it("handles zero and large steps", () => {
    expect(addDays("2026-10-25", 0)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 89)).toBe("2027-01-22");
  });
});

describe("diffDays", () => {
  it("returns whole days across DST", () => {
    expect(diffDays("2026-03-07", "2026-03-09")).toBe(2);
    expect(diffDays("2026-10-31", "2026-11-02")).toBe(2);
    expect(diffDays("2026-10-25", "2026-10-25")).toBe(0);
    expect(diffDays("2026-10-25", "2026-10-24")).toBe(-1);
    expect(diffDays("2026-10-25", "2027-01-22")).toBe(89);
  });
});

describe("compareDays", () => {
  it("orders lexicographically", () => {
    expect(compareDays("2026-01-01", "2026-01-02")).toBeLessThan(0);
    expect(compareDays("2026-01-02", "2026-01-01")).toBeGreaterThan(0);
    expect(compareDays("2026-01-01", "2026-01-01")).toBe(0);
  });
});

describe("weekdayMonFirst", () => {
  it("maps Monday to 0 and Sunday to 6", () => {
    expect(weekdayMonFirst("2026-10-26")).toBe(0); // Monday
    expect(weekdayMonFirst("2026-10-25")).toBe(6); // Sunday
    expect(weekdayMonFirst("2026-10-28")).toBe(2); // Wednesday
  });
});

describe("startOfWeekMon", () => {
  it("returns the Monday on or before the day", () => {
    expect(startOfWeekMon("2026-10-25")).toBe("2026-10-19");
    expect(startOfWeekMon("2026-10-26")).toBe("2026-10-26");
    expect(startOfWeekMon("2026-11-01")).toBe("2026-10-26");
  });
});

describe("months", () => {
  it("knows month lengths including leap years", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
  it("extracts and shifts months", () => {
    expect(monthOf("2026-10-25")).toEqual({ year: 2026, month: 10 });
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("isValidYMD", () => {
  it("accepts real dates only", () => {
    expect(isValidYMD("2026-10-25")).toBe(true);
    expect(isValidYMD("2026-02-30")).toBe(false);
    expect(isValidYMD("2026-13-01")).toBe(false);
    expect(isValidYMD("26-10-25")).toBe(false);
    expect(isValidYMD("2026-10-25T00:00")).toBe(false);
  });
});
