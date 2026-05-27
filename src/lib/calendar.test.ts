import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  addCalendarWeeks,
  CALENDAR_GRID_HEIGHT_PX,
  CALENDAR_SNAP_MINUTES,
  calculateMovedRange,
  calculateResizedRange,
  clampMinutesToDay,
  endOfDay,
  endOfWeekMonday,
  formatCalendarDateParam,
  getWeekDays,
  getWeekQueryRange,
  layoutBlockInDay,
  MIN_TIME_BLOCK_DURATION_MINUTES,
  minutesToHeightPercent,
  minutesToTopPercent,
  parseCalendarDateParam,
  parseCalendarViewParam,
  pixelYToMinutes,
  snapMinutes,
  startOfDay,
  startOfWeekMonday,
} from "./calendar";

describe("parseCalendarDateParam", () => {
  it("parses a valid YYYY-MM-DD param", () => {
    const day = parseCalendarDateParam("2026-05-21");
    expect(day.getFullYear()).toBe(2026);
    expect(day.getMonth()).toBe(4);
    expect(day.getDate()).toBe(21);
    expect(day.getHours()).toBe(0);
  });

  it("falls back to today for invalid params", () => {
    const today = startOfDay(new Date());
    expect(parseCalendarDateParam("not-a-date").getDate()).toBe(today.getDate());
    expect(parseCalendarDateParam("2026-13-40").getDate()).toBe(today.getDate());
    expect(parseCalendarDateParam(undefined).getDate()).toBe(today.getDate());
  });
});

describe("formatCalendarDateParam", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(formatCalendarDateParam(new Date(2026, 4, 21))).toBe("2026-05-21");
  });
});

describe("addCalendarDays", () => {
  it("moves to adjacent days at start of day", () => {
    const base = parseCalendarDateParam("2026-05-21");
    const next = addCalendarDays(base, 1);
    expect(formatCalendarDateParam(next)).toBe("2026-05-22");
    expect(next.getHours()).toBe(0);
  });
});

describe("parseCalendarViewParam", () => {
  it("defaults to week", () => {
    expect(parseCalendarViewParam(undefined)).toBe("week");
    expect(parseCalendarViewParam("week")).toBe("week");
    expect(parseCalendarViewParam("invalid")).toBe("week");
  });

  it("returns day only for view=day", () => {
    expect(parseCalendarViewParam("day")).toBe("day");
  });
});

describe("startOfWeekMonday", () => {
  it("returns Monday for a Wednesday anchor", () => {
    const wed = parseCalendarDateParam("2026-05-21");
    expect(wed.getDay()).toBe(4);
    const mon = startOfWeekMonday(wed);
    expect(formatCalendarDateParam(mon)).toBe("2026-05-18");
  });

  it("returns same day when anchor is Monday", () => {
    const mon = parseCalendarDateParam("2026-05-18");
    expect(formatCalendarDateParam(startOfWeekMonday(mon))).toBe("2026-05-18");
  });

  it("returns previous Monday when anchor is Sunday", () => {
    const sun = parseCalendarDateParam("2026-05-24");
    expect(sun.getDay()).toBe(0);
    expect(formatCalendarDateParam(startOfWeekMonday(sun))).toBe("2026-05-18");
  });
});

describe("getWeekDays", () => {
  it("returns Monday through Sunday", () => {
    const weekStart = parseCalendarDateParam("2026-05-18");
    const days = getWeekDays(weekStart);
    expect(days).toHaveLength(7);
    expect(formatCalendarDateParam(days[0])).toBe("2026-05-18");
    expect(formatCalendarDateParam(days[6])).toBe("2026-05-24");
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
  });
});

describe("getWeekQueryRange", () => {
  it("spans Monday 00:00 to next Monday 00:00", () => {
    const anchor = parseCalendarDateParam("2026-05-21");
    const { weekStart, weekEnd } = getWeekQueryRange(anchor);
    expect(formatCalendarDateParam(weekStart)).toBe("2026-05-18");
    expect(weekEnd).toEqual(endOfWeekMonday(anchor));
    expect(formatCalendarDateParam(addCalendarDays(weekStart, 7))).toBe(
      formatCalendarDateParam(weekEnd),
    );
  });
});

describe("addCalendarWeeks", () => {
  it("moves anchor by whole weeks from Monday", () => {
    const anchor = parseCalendarDateParam("2026-05-21");
    const next = addCalendarWeeks(anchor, 1);
    expect(formatCalendarDateParam(next)).toBe("2026-05-25");
    const prev = addCalendarWeeks(anchor, -1);
    expect(formatCalendarDateParam(prev)).toBe("2026-05-11");
  });
});

describe("snapMinutes", () => {
  it("snaps to 5-minute intervals by default", () => {
    expect(snapMinutes(0)).toBe(0);
    expect(snapMinutes(2)).toBe(0);
    expect(snapMinutes(3)).toBe(5);
    expect(snapMinutes(127)).toBe(125);
    expect(snapMinutes(1440)).toBe(1440);
  });

  it("uses configurable snap interval", () => {
    expect(snapMinutes(17, 10)).toBe(20);
    expect(snapMinutes(17, CALENDAR_SNAP_MINUTES)).toBe(15);
  });
});

describe("clampMinutesToDay", () => {
  it("clamps to 00:00–24:00", () => {
    expect(clampMinutesToDay(-10)).toBe(0);
    expect(clampMinutesToDay(100)).toBe(100);
    expect(clampMinutesToDay(2000)).toBe(1440);
  });
});

describe("pixelYToMinutes", () => {
  it("converts Y position to minutes across the grid height", () => {
    expect(pixelYToMinutes(0, CALENDAR_GRID_HEIGHT_PX)).toBe(0);
    expect(pixelYToMinutes(CALENDAR_GRID_HEIGHT_PX / 2, CALENDAR_GRID_HEIGHT_PX)).toBe(
      720,
    );
    expect(pixelYToMinutes(CALENDAR_GRID_HEIGHT_PX, CALENDAR_GRID_HEIGHT_PX)).toBe(
      1440,
    );
  });
});

describe("minutesToTopPercent and minutesToHeightPercent", () => {
  it("maps minutes to layout percentages", () => {
    expect(minutesToTopPercent(120)).toBeCloseTo((120 / 1440) * 100);
    expect(minutesToHeightPercent(60)).toBeCloseTo((60 / 1440) * 100);
  });
});

describe("calculateMovedRange", () => {
  const day = parseCalendarDateParam("2026-05-21");

  it("moves a block while preserving duration", () => {
    const originalStart = new Date(2026, 4, 21, 9, 0);
    const originalEnd = new Date(2026, 4, 21, 10, 30);

    const result = calculateMovedRange(
      originalStart,
      originalEnd,
      12 * 60,
      day,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.startTime.getHours()).toBe(12);
      expect(result.startTime.getMinutes()).toBe(0);
      const duration =
        (result.endTime.getTime() - result.startTime.getTime()) / 60_000;
      expect(duration).toBe(90);
    }
  });

  it("snaps moved start to 5 minutes", () => {
    const originalStart = new Date(2026, 4, 21, 9, 0);
    const originalEnd = new Date(2026, 4, 21, 9, 30);

    const result = calculateMovedRange(
      originalStart,
      originalEnd,
      10 * 60 + 2,
      day,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.startTime.getMinutes()).toBe(0);
    }
  });

  it("clamps move so the block stays inside the day", () => {
    const originalStart = new Date(2026, 4, 21, 9, 0);
    const originalEnd = new Date(2026, 4, 21, 11, 0);

    const result = calculateMovedRange(
      originalStart,
      originalEnd,
      23 * 60,
      day,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.endTime.getTime()).toBeLessThanOrEqual(endOfDay(day).getTime());
      expect(result.startTime.getTime()).toBeGreaterThanOrEqual(
        startOfDay(day).getTime(),
      );
    }
  });

  it("rejects invalid move when duration exceeds the day", () => {
    const originalStart = new Date(2026, 4, 21, 0, 0);
    const originalEnd = new Date(
      originalStart.getTime() + 25 * 60 * 60_000,
    );

    expect(
      calculateMovedRange(originalStart, originalEnd, 12 * 60, day).ok,
    ).toBe(false);
  });

  it("rejects zero or negative duration", () => {
    const t = new Date(2026, 4, 21, 10, 0);
    expect(calculateMovedRange(t, t, 60, day).ok).toBe(false);
  });
});

describe("calculateResizedRange", () => {
  const day = parseCalendarDateParam("2026-05-21");

  it("changes endTime only and keeps originalStart", () => {
    const originalStart = new Date(2026, 4, 21, 9, 0);

    const result = calculateResizedRange(originalStart, 11 * 60, day);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.startTime).toEqual(originalStart);
      expect(result.endTime.getHours()).toBe(11);
      expect(result.endTime.getMinutes()).toBe(0);
    }
  });

  it("enforces minimum duration", () => {
    const originalStart = new Date(2026, 4, 21, 9, 0);

    const result = calculateResizedRange(
      originalStart,
      9 * 60 + 10,
      day,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const duration =
        (result.endTime.getTime() - result.startTime.getTime()) / 60_000;
      expect(duration).toBeGreaterThanOrEqual(MIN_TIME_BLOCK_DURATION_MINUTES);
    }
  });

  it("rejects end before start", () => {
    const originalStart = new Date(2026, 4, 21, 11, 0);

    expect(calculateResizedRange(originalStart, 10 * 60, day).ok).toBe(false);
  });

  it("snaps end to 5-minute intervals", () => {
    const originalStart = new Date(2026, 4, 21, 9, 0);

    const result = calculateResizedRange(originalStart, 10 * 60 + 3, day);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.endTime.getMinutes() % CALENDAR_SNAP_MINUTES).toBe(0);
    }
  });
});

describe("layoutBlockInDay", () => {
  const day = parseCalendarDateParam("2026-05-21");

  it("positions a block fully inside the day", () => {
    const layout = layoutBlockInDay(
      {
        startTime: new Date(2026, 4, 21, 9, 0),
        endTime: new Date(2026, 4, 21, 10, 30),
      },
      day,
    );

    expect(layout).not.toBeNull();
    expect(layout?.topPercent).toBeCloseTo((9 * 60) / (24 * 60) * 100);
    expect(layout?.heightPercent).toBeCloseTo((90 / (24 * 60)) * 100);
  });

  it("clips a block that starts before the day", () => {
    const layout = layoutBlockInDay(
      {
        startTime: new Date(2026, 4, 20, 22, 0),
        endTime: new Date(2026, 4, 21, 2, 0),
      },
      day,
    );

    expect(layout).not.toBeNull();
    expect(layout?.visibleStart).toEqual(startOfDay(day));
    expect(layout?.topPercent).toBe(0);
    expect(layout?.heightPercent).toBeCloseTo((2 * 60) / (24 * 60) * 100);
  });

  it("clips a block that ends after the day", () => {
    const layout = layoutBlockInDay(
      {
        startTime: new Date(2026, 4, 21, 23, 0),
        endTime: new Date(2026, 4, 22, 1, 0),
      },
      day,
    );

    expect(layout).not.toBeNull();
    expect(layout?.visibleEnd).toEqual(endOfDay(day));
    expect(layout?.heightPercent).toBeCloseTo((60 / (24 * 60)) * 100);
  });

  it("returns null when the block does not overlap the day", () => {
    expect(
      layoutBlockInDay(
        {
          startTime: new Date(2026, 4, 20, 9, 0),
          endTime: new Date(2026, 4, 20, 10, 0),
        },
        day,
      ),
    ).toBeNull();
  });
});
