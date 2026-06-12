import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  addCalendarWeeks,
  CALENDAR_GRID_HEIGHT_PX,
  CALENDAR_SNAP_MINUTES,
  calculateMovedRange,
  calculateResizedRange,
  calculateSnappedDragTopPx,
  clampMinutesToDay,
  endOfDay,
  endOfWeekMonday,
  formatCalendarDateParam,
  getCalendarTimeZone,
  getWeekDays,
  getWeekQueryRange,
  getVisibleSegmentInDay,
  layoutBlockInDay,
  layoutBlocksInDay,
  MIN_TIME_BLOCK_DURATION_MINUTES,
  visibleIntervalsOverlap,
  minutesToHeightPercent,
  minutesToTopPercent,
  parseCalendarDateParam,
  parseCalendarViewParam,
  pixelYToMinutes,
  snapMinutes,
  startOfDay,
  startOfWeekMonday,
} from "./calendar";
import {
  getCalendarWeekday,
  zonedStartOfCalendarDay,
} from "./calendar-timezone";

/** Wall-clock time on a calendar date in the app timezone. */
function atCalendarTime(
  dateParam: string,
  hours: number,
  minutes = 0,
  timeZone = getCalendarTimeZone(),
): Date {
  return new Date(
    zonedStartOfCalendarDay(dateParam, timeZone).getTime() +
      (hours * 60 + minutes) * 60_000,
  );
}

describe("parseCalendarDateParam", () => {
  it("parses a valid YYYY-MM-DD param", () => {
    const day = parseCalendarDateParam("2026-05-21");
    expect(formatCalendarDateParam(day)).toBe("2026-05-21");
  });

  it("falls back to today for invalid params", () => {
    const todayParam = formatCalendarDateParam(new Date());
    expect(formatCalendarDateParam(parseCalendarDateParam("not-a-date"))).toBe(
      todayParam,
    );
    expect(formatCalendarDateParam(parseCalendarDateParam("2026-13-40"))).toBe(
      todayParam,
    );
    expect(formatCalendarDateParam(parseCalendarDateParam(undefined))).toBe(
      todayParam,
    );
  });
});

describe("formatCalendarDateParam", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(formatCalendarDateParam(atCalendarTime("2026-05-21", 12))).toBe(
      "2026-05-21",
    );
  });
});

describe("addCalendarDays", () => {
  it("moves to adjacent days at start of day", () => {
    const base = parseCalendarDateParam("2026-05-21");
    const next = addCalendarDays(base, 1);
    expect(formatCalendarDateParam(next)).toBe("2026-05-22");
    expect(formatCalendarDateParam(next)).toBe(
      formatCalendarDateParam(zonedStartOfCalendarDay("2026-05-22")),
    );
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
    expect(getCalendarWeekday("2026-05-21")).toBe(4);
    const mon = startOfWeekMonday(wed);
    expect(formatCalendarDateParam(mon)).toBe("2026-05-18");
  });

  it("returns same day when anchor is Monday", () => {
    const mon = parseCalendarDateParam("2026-05-18");
    expect(formatCalendarDateParam(startOfWeekMonday(mon))).toBe("2026-05-18");
  });

  it("returns previous Monday when anchor is Sunday", () => {
    const sun = parseCalendarDateParam("2026-05-24");
    expect(getCalendarWeekday("2026-05-24")).toBe(0);
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
    expect(getCalendarWeekday(formatCalendarDateParam(days[0]))).toBe(1);
    expect(getCalendarWeekday(formatCalendarDateParam(days[6]))).toBe(0);
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
    const originalStart = atCalendarTime("2026-05-21", 9, 0);
    const originalEnd = atCalendarTime("2026-05-21", 10, 30);

    const result = calculateMovedRange(
      originalStart,
      originalEnd,
      12 * 60,
      day,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(formatCalendarDateParam(result.startTime)).toBe("2026-05-21");
      expect(
        (result.startTime.getTime() - zonedStartOfCalendarDay("2026-05-21").getTime()) /
          60_000,
      ).toBe(12 * 60);
      const duration =
        (result.endTime.getTime() - result.startTime.getTime()) / 60_000;
      expect(duration).toBe(90);
    }
  });

  it("snaps moved start to 5 minutes", () => {
    const originalStart = atCalendarTime("2026-05-21", 9, 0);
    const originalEnd = atCalendarTime("2026-05-21", 9, 30);

    const result = calculateMovedRange(
      originalStart,
      originalEnd,
      10 * 60 + 2,
      day,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        (result.startTime.getTime() - zonedStartOfCalendarDay("2026-05-21").getTime()) %
          (60 * 60_000),
      ).toBe(0);
    }
  });

  it("clamps move so the block stays inside the day", () => {
    const originalStart = atCalendarTime("2026-05-21", 9, 0);
    const originalEnd = atCalendarTime("2026-05-21", 11, 0);

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
    const originalStart = atCalendarTime("2026-05-21", 0, 0);
    const originalEnd = new Date(
      originalStart.getTime() + 25 * 60 * 60_000,
    );

    expect(
      calculateMovedRange(originalStart, originalEnd, 12 * 60, day).ok,
    ).toBe(false);
  });

  it("rejects zero or negative duration", () => {
    const t = atCalendarTime("2026-05-21", 10, 0);
    expect(calculateMovedRange(t, t, 60, day).ok).toBe(false);
  });
});

describe("calculateResizedRange", () => {
  const day = parseCalendarDateParam("2026-05-21");

  it("changes endTime only and keeps originalStart", () => {
    const originalStart = atCalendarTime("2026-05-21", 9, 0);

    const result = calculateResizedRange(originalStart, 11 * 60, day);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.startTime).toEqual(originalStart);
      expect(
        (result.endTime.getTime() - zonedStartOfCalendarDay("2026-05-21").getTime()) /
          60_000,
      ).toBe(11 * 60);
    }
  });

  it("enforces minimum duration", () => {
    const originalStart = atCalendarTime("2026-05-21", 9, 0);

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
    const originalStart = atCalendarTime("2026-05-21", 11, 0);

    expect(calculateResizedRange(originalStart, 10 * 60, day).ok).toBe(false);
  });

  it("snaps end to 5-minute intervals", () => {
    const originalStart = atCalendarTime("2026-05-21", 9, 0);

    const result = calculateResizedRange(originalStart, 10 * 60 + 3, day);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.endTime.getMinutes() % CALENDAR_SNAP_MINUTES).toBe(0);
    }
  });

  it("does not push endTime past 24:00 when enforcing minimum duration", () => {
    const lateStart = atCalendarTime("2026-05-21", 23, 58);
    const result = calculateResizedRange(lateStart, 23 * 60 + 59, day);
    expect(result.ok).toBe(false);
  });
});

describe("calculateSnappedDragTopPx", () => {
  const day = parseCalendarDateParam("2026-05-21");

  it("preserves visible segment duration when moving", () => {
    const segmentStart = atCalendarTime("2026-05-21", 9, 0);
    const segmentEnd = atCalendarTime("2026-05-21", 9, 30);
    const pointerY = (10 * 60 / 1440) * CALENDAR_GRID_HEIGHT_PX;

    const topPx = calculateSnappedDragTopPx(
      pointerY,
      segmentStart,
      segmentEnd,
      day,
    );

    expect(topPx).not.toBeNull();
    const moved = calculateMovedRange(
      segmentStart,
      segmentEnd,
      (topPx! / CALENDAR_GRID_HEIGHT_PX) * 1440,
      day,
    );
    expect(moved.ok).toBe(true);
    if (moved.ok) {
      const duration =
        (moved.endTime.getTime() - moved.startTime.getTime()) / 60_000;
      expect(duration).toBe(30);
      expect(
        (moved.startTime.getTime() - zonedStartOfCalendarDay("2026-05-21").getTime()) /
          60_000,
      ).toBe(10 * 60);
    }
  });

  it("snaps preview top to 5-minute grid", () => {
    const segmentStart = atCalendarTime("2026-05-21", 9, 0);
    const segmentEnd = atCalendarTime("2026-05-21", 10, 0);
    const blockTopPx = ((9 * 60 + 2) / 1440) * CALENDAR_GRID_HEIGHT_PX;
    const topPx = calculateSnappedDragTopPx(
      blockTopPx,
      segmentStart,
      segmentEnd,
      day,
    );

    expect(topPx).not.toBeNull();
    const minutes = (topPx! / CALENDAR_GRID_HEIGHT_PX) * 1440;
    expect(minutes % CALENDAR_SNAP_MINUTES).toBe(0);
  });

  it("clamps cross-midnight visible segment drag to same day", () => {
    const block = {
      startTime: atCalendarTime("2026-05-20", 22, 0),
      endTime: atCalendarTime("2026-05-21", 2, 0),
    };
    const layout = layoutBlockInDay(block, day);
    expect(layout).not.toBeNull();

    const latePointerY = (22 * 60 / 1440) * CALENDAR_GRID_HEIGHT_PX;
    const topPx = calculateSnappedDragTopPx(
      latePointerY,
      layout!.visibleStart,
      layout!.visibleEnd,
      day,
    );

    expect(topPx).not.toBeNull();
    const targetMinutes = (topPx! / CALENDAR_GRID_HEIGHT_PX) * 1440;
    const moved = calculateMovedRange(
      layout!.visibleStart,
      layout!.visibleEnd,
      targetMinutes,
      day,
    );
    expect(moved.ok).toBe(true);
    if (moved.ok) {
      const visibleDuration =
        (layout!.visibleEnd.getTime() - layout!.visibleStart.getTime()) / 60_000;
      const resultDuration =
        (moved.endTime.getTime() - moved.startTime.getTime()) / 60_000;
      expect(resultDuration).toBe(visibleDuration);
      expect(moved.startTime.getTime()).toBeGreaterThanOrEqual(
        startOfDay(day).getTime(),
      );
      expect(moved.endTime.getTime()).toBeLessThanOrEqual(endOfDay(day).getTime());
    }
  });
});

describe("visibleIntervalsOverlap", () => {
  const seg = (startH: number, endH: number, date = "2026-05-21") => {
    const start = atCalendarTime(date, startH);
    const end = atCalendarTime(date, endH);
    return { visibleStart: start, visibleEnd: end };
  };

  it("does not overlap adjacent 04:00–05:00 and 05:00–06:00", () => {
    expect(visibleIntervalsOverlap(seg(4, 5), seg(5, 6))).toBe(false);
  });

  it("does not overlap 06:00–06:45 and 07:00–09:00", () => {
    const a = seg(6, 6);
    a.visibleEnd = atCalendarTime("2026-05-21", 6, 45);
    expect(visibleIntervalsOverlap(a, seg(7, 9))).toBe(false);
  });

  it("overlaps 06:00–08:00 and 07:00–09:00", () => {
    expect(visibleIntervalsOverlap(seg(6, 8), seg(7, 9))).toBe(true);
  });
});

describe("getVisibleSegmentInDay", () => {
  const day = parseCalendarDateParam("2026-06-01");

  it("same-day 07:00–09:00 keeps full visible range", () => {
    const block = {
      startTime: atCalendarTime("2026-06-01", 7),
      endTime: atCalendarTime("2026-06-01", 9),
    };
    const seg = getVisibleSegmentInDay(block, day);
    expect(seg).not.toBeNull();
    expect(seg!.visibleStart).toEqual(block.startTime);
    expect(seg!.visibleEnd).toEqual(block.endTime);
    expect(
      (seg!.visibleEnd.getTime() - seg!.visibleStart.getTime()) / 60_000,
    ).toBe(120);
  });

  it("previous-day cross-midnight shows 00:00–04:00 on selected day", () => {
    const block = {
      startTime: atCalendarTime("2026-05-31", 22),
      endTime: atCalendarTime("2026-06-01", 4),
    };
    const seg = getVisibleSegmentInDay(block, day);
    expect(seg).not.toBeNull();
    expect(seg!.visibleStart).toEqual(zonedStartOfCalendarDay("2026-06-01"));
    expect(seg!.visibleEnd).toEqual(atCalendarTime("2026-06-01", 4));
    expect(
      (seg!.visibleEnd.getTime() - seg!.visibleStart.getTime()) / 60_000,
    ).toBe(240);
  });

  it("selected-day cross-midnight shows 22:00–24:00 on start day", () => {
    const block = {
      startTime: atCalendarTime("2026-06-01", 22),
      endTime: atCalendarTime("2026-06-02", 4),
    };
    const seg = getVisibleSegmentInDay(block, day);
    expect(seg).not.toBeNull();
    expect(seg!.visibleStart).toEqual(atCalendarTime("2026-06-01", 22));
    expect(seg!.visibleEnd).toEqual(endOfDay(day));
    expect(
      (seg!.visibleEnd.getTime() - seg!.visibleStart.getTime()) / 60_000,
    ).toBe(120);
  });

  it("returns null when block is outside selected day", () => {
    expect(
      getVisibleSegmentInDay(
        {
          startTime: atCalendarTime("2026-05-20", 9),
          endTime: atCalendarTime("2026-05-20", 10),
        },
        day,
      ),
    ).toBeNull();
  });
});

describe("layoutBlocksInDay overlap columns", () => {
  const day = parseCalendarDateParam("2026-05-21");

  it("assigns side-by-side columns for overlapping blocks", () => {
    const layouts = layoutBlocksInDay(
      [
        {
          id: "a",
          startTime: atCalendarTime("2026-05-21", 6),
          endTime: atCalendarTime("2026-05-21", 8),
        },
        {
          id: "b",
          startTime: atCalendarTime("2026-05-21", 7),
          endTime: atCalendarTime("2026-05-21", 9),
        },
      ],
      day,
    );
    expect(layouts).toHaveLength(2);
    expect(layouts[0].columnsInGroup).toBe(2);
    expect(layouts[1].columnsInGroup).toBe(2);
    expect(layouts[0].columnIndex).not.toBe(layouts[1].columnIndex);
  });

  it("assigns two columns for exact same-time blocks", () => {
    const start = atCalendarTime("2026-05-21", 10);
    const end = atCalendarTime("2026-05-21", 11);
    const layouts = layoutBlocksInDay(
      [
        { id: "a", title: "A", startTime: start, endTime: end },
        { id: "b", title: "B", startTime: start, endTime: end },
      ],
      day,
    );
    const byId = Object.fromEntries(layouts.map((layout) => [layout.id, layout]));
    expect(byId.a?.columnIndex).toBe(0);
    expect(byId.b?.columnIndex).toBe(1);
    expect(byId.a?.columnsInGroup).toBe(2);
    expect(byId.b?.columnsInGroup).toBe(2);
    expect(byId.a?.widthPercent).toBe(50);
    expect(byId.b?.leftPercent).toBe(50);
  });

  it("assigns three columns for three overlapping blocks", () => {
    const layouts = layoutBlocksInDay(
      [
        {
          id: "a",
          startTime: atCalendarTime("2026-05-21", 10),
          endTime: atCalendarTime("2026-05-21", 12),
        },
        {
          id: "b",
          startTime: atCalendarTime("2026-05-21", 10, 15),
          endTime: atCalendarTime("2026-05-21", 10, 45),
        },
        {
          id: "c",
          startTime: atCalendarTime("2026-05-21", 10, 30),
          endTime: atCalendarTime("2026-05-21", 11, 30),
        },
      ],
      day,
    );
    expect(layouts).toHaveLength(3);
    expect(new Set(layouts.map((layout) => layout.columnIndex)).size).toBe(3);
    expect(layouts.every((layout) => layout.columnsInGroup === 3)).toBe(true);
  });

  it("keeps full width for non-overlapping blocks", () => {
    const layouts = layoutBlocksInDay(
      [
        {
          id: "a",
          startTime: atCalendarTime("2026-05-21", 4),
          endTime: atCalendarTime("2026-05-21", 5),
        },
        {
          id: "b",
          startTime: atCalendarTime("2026-05-21", 5),
          endTime: atCalendarTime("2026-05-21", 6),
        },
      ],
      day,
    );
    expect(layouts.every((l) => l.columnsInGroup === 1 && l.widthPercent === 100)).toBe(
      true,
    );
  });
});

describe("layoutBlockInDay", () => {
  const day = parseCalendarDateParam("2026-05-21");

  it("positions a block fully inside the day", () => {
    const layout = layoutBlockInDay(
      {
        startTime: atCalendarTime("2026-05-21", 9, 0),
        endTime: atCalendarTime("2026-05-21", 10, 30),
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
        startTime: atCalendarTime("2026-05-20", 22, 0),
        endTime: atCalendarTime("2026-05-21", 2, 0),
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
        startTime: atCalendarTime("2026-05-21", 23, 0),
        endTime: atCalendarTime("2026-05-22", 1, 0),
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
          startTime: atCalendarTime("2026-05-20", 9, 0),
          endTime: atCalendarTime("2026-05-20", 10, 0),
        },
        day,
      ),
    ).toBeNull();
  });
});
