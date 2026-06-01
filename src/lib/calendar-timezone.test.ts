import { describe, expect, it } from "vitest";
import {
  addCalendarDateParam,
  formatCalendarDateParamInTimeZone,
  getDayBoundsForDateParam,
  zonedStartOfCalendarDay,
} from "./calendar-timezone";
import { layoutBlockInDay, parseCalendarDateParam } from "./calendar";

const TZ = "Asia/Shanghai";

describe("calendar timezone", () => {
  it("maps June 1 02:00 Shanghai to the June 1 column, not May 31", () => {
    const day = parseCalendarDateParam("2026-06-01");
    const blockStart = new Date("2026-05-31T18:00:00.000Z");
    const blockEnd = new Date("2026-06-01T00:00:00.000Z");

    expect(layoutBlockInDay({ startTime: blockStart, endTime: blockEnd }, day)).not.toBeNull();

    const may31 = parseCalendarDateParam("2026-05-31");
    expect(
      layoutBlockInDay({ startTime: blockStart, endTime: blockEnd }, may31),
    ).toBeNull();
  });

  it("week column date param matches zoned midnight label", () => {
    const param = "2026-06-01";
    const start = zonedStartOfCalendarDay(param, TZ);
    expect(formatCalendarDateParamInTimeZone(start, TZ)).toBe(param);
    const { dayStart, dayEnd } = getDayBoundsForDateParam(param, TZ);
    expect(dayEnd.getTime() - dayStart.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("adds civil days on date params", () => {
    expect(addCalendarDateParam("2026-05-31", 1)).toBe("2026-06-01");
  });
});
