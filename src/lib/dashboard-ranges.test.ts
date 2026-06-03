import { describe, expect, it } from "vitest";
import {
  getDayQueryRange,
  getWeekQueryRange,
  parseCalendarDateParam,
} from "@/lib/calendar";
import { getDashboardDateRanges } from "@/lib/dashboard-ranges";

const NY = "America/New_York";
const SHANGHAI = "Asia/Shanghai";

describe("getDashboardDateRanges (TZ-4)", () => {
  const now = new Date("2026-06-01T13:30:00.000Z");

  it("matches calendar getDayQueryRange for New York today", () => {
    const dash = getDashboardDateRanges(now, NY);
    const cal = getDayQueryRange("2026-06-01", NY);
    expect(dash.todayStart.toISOString()).toBe(cal.dayStart.toISOString());
    expect(dash.todayEnd.toISOString()).toBe(cal.dayEnd.toISOString());
  });

  it("matches calendar getWeekQueryRange for New York", () => {
    const dash = getDashboardDateRanges(now, NY);
    const cal = getWeekQueryRange(parseCalendarDateParam("2026-06-01", NY), NY);
    expect(dash.weekStart.toISOString()).toBe(cal.weekStart.toISOString());
    expect(dash.weekEnd.toISOString()).toBe(cal.weekEnd.toISOString());
  });

  it("uses different UTC boundaries for Shanghai vs New York", () => {
    const ny = getDashboardDateRanges(now, NY);
    const sh = getDashboardDateRanges(now, SHANGHAI);
    expect(ny.todayStart.toISOString()).toBe("2026-06-01T04:00:00.000Z");
    expect(sh.todayStart.toISOString()).toBe("2026-05-31T16:00:00.000Z");
    expect(ny.todayStart.getTime()).not.toBe(sh.todayStart.getTime());
  });
});
