import { describe, expect, it } from "vitest";
import { wallTimeInTimeZoneToUtcIso } from "@/lib/datetime-local-iso";
import {
  formatCalendarDateParam,
  getDayQueryRange,
  getVisibleSegmentInDay,
  layoutBlockInDay,
  parseCalendarDateParam,
} from "@/lib/calendar";
import { zonedStartOfCalendarDay } from "@/lib/calendar-timezone";

const NY = "America/New_York";
const SHANGHAI = "Asia/Shanghai";

function blockAtLocal(
  dateParam: string,
  startH: number,
  endDateParam: string,
  endH: number,
  timeZone: string,
) {
  return {
    startTime: new Date(
      wallTimeInTimeZoneToUtcIso(dateParam, startH, 0, timeZone),
    ),
    endTime: new Date(
      wallTimeInTimeZoneToUtcIso(endDateParam, endH, 0, timeZone),
    ),
  };
}

describe("getDayQueryRange (TZ-3)", () => {
  it("returns New York local day boundaries as UTC instants", () => {
    const { dayStart, dayEnd } = getDayQueryRange("2026-06-01", NY);
    expect(dayStart.toISOString()).toBe("2026-06-01T04:00:00.000Z");
    expect(dayEnd.toISOString()).toBe("2026-06-02T04:00:00.000Z");
  });

  it("returns Shanghai local day boundaries as different UTC instants", () => {
    const { dayStart, dayEnd } = getDayQueryRange("2026-06-01", SHANGHAI);
    expect(dayStart.toISOString()).toBe("2026-05-31T16:00:00.000Z");
    expect(dayEnd.toISOString()).toBe("2026-06-01T16:00:00.000Z");
  });
});

describe("parseCalendarDateParam / formatCalendarDateParam (TZ-3)", () => {
  it("round-trips YYYY-MM-DD in user timezone without UTC off-by-one", () => {
    const nyDay = parseCalendarDateParam("2026-06-01", NY);
    expect(formatCalendarDateParam(nyDay, NY)).toBe("2026-06-01");

    const shDay = parseCalendarDateParam("2026-06-01", SHANGHAI);
    expect(formatCalendarDateParam(shDay, SHANGHAI)).toBe("2026-06-01");
  });

  it("does not interpret date param as UTC midnight", () => {
    const nyInstant = parseCalendarDateParam("2026-06-01", NY);
    expect(nyInstant.toISOString()).toBe("2026-06-01T04:00:00.000Z");
    expect(nyInstant.toISOString()).not.toBe("2026-06-01T00:00:00.000Z");
  });
});

describe("layout and labels in user timezone (TZ-3)", () => {
  it("places New York 09:00–10:00 at 09:00 on the grid", () => {
    const day = parseCalendarDateParam("2026-06-01", NY);
    const block = blockAtLocal("2026-06-01", 9, "2026-06-01", 10, NY);
    const layout = layoutBlockInDay(block, day, NY);
    expect(layout).not.toBeNull();
    expect(layout!.topPercent).toBeCloseTo((9 * 60) / (24 * 60) * 100);
    expect(layout!.heightPercent).toBeCloseTo((60 / (24 * 60)) * 100);
  });

  it("places Shanghai 09:00–10:00 at 09:00 on the grid", () => {
    const day = parseCalendarDateParam("2026-06-01", SHANGHAI);
    const block = blockAtLocal("2026-06-01", 9, "2026-06-01", 10, SHANGHAI);
    const layout = layoutBlockInDay(block, day, SHANGHAI);
    expect(layout).not.toBeNull();
    expect(layout!.topPercent).toBeCloseTo((9 * 60) / (24 * 60) * 100);
  });
});

describe("cross-midnight visible segments (TZ-3)", () => {
  it("shows 22:00–24:00 on start day in New York", () => {
    const day = parseCalendarDateParam("2026-06-01", NY);
    const block = blockAtLocal("2026-06-01", 22, "2026-06-02", 4, NY);
    const seg = getVisibleSegmentInDay(block, day, NY);
    expect(seg).not.toBeNull();
    expect(seg!.visibleStart).toEqual(block.startTime);
    expect(seg!.visibleEnd.toISOString()).toBe("2026-06-02T04:00:00.000Z");
  });

  it("shows 00:00–04:00 on next day in New York", () => {
    const day = parseCalendarDateParam("2026-06-02", NY);
    const block = blockAtLocal("2026-06-01", 22, "2026-06-02", 4, NY);
    const seg = getVisibleSegmentInDay(block, day, NY);
    expect(seg).not.toBeNull();
    expect(seg!.visibleStart).toEqual(zonedStartOfCalendarDay("2026-06-02", NY));
    expect(seg!.visibleEnd).toEqual(block.endTime);
  });

  it("splits cross-midnight block in Shanghai the same way", () => {
    const startDay = parseCalendarDateParam("2026-06-01", SHANGHAI);
    const block = blockAtLocal("2026-06-01", 22, "2026-06-02", 4, SHANGHAI);
    const evening = getVisibleSegmentInDay(block, startDay, SHANGHAI);
    expect(evening!.visibleEnd.toISOString()).toBe("2026-06-01T16:00:00.000Z");

    const nextDay = parseCalendarDateParam("2026-06-02", SHANGHAI);
    const morning = getVisibleSegmentInDay(block, nextDay, SHANGHAI);
    expect(morning!.visibleStart.toISOString()).toBe("2026-06-01T16:00:00.000Z");
    expect(morning!.visibleEnd).toEqual(block.endTime);
  });
});
