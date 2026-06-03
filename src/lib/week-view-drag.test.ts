import { describe, expect, it } from "vitest";
import { zonedStartOfCalendarDay } from "./calendar-timezone";
import {
  canDragCalendarColumnBlockInWeekView,
  canDragTimeBlockInWeekView,
  isSameDayTimeBlock,
} from "./week-view-drag";

function atCalendarTime(dateParam: string, hours: number, minutes = 0): Date {
  return new Date(
    zonedStartOfCalendarDay(dateParam).getTime() + (hours * 60 + minutes) * 60_000,
  );
}

describe("week-view-drag", () => {
  it("allows same-day blocks", () => {
    const block = {
      startTime: atCalendarTime("2026-06-01", 9),
      endTime: atCalendarTime("2026-06-01", 10),
    };
    expect(isSameDayTimeBlock(block)).toBe(true);
    expect(canDragTimeBlockInWeekView(block)).toBe(true);
  });

  it("disallows cross-midnight blocks in week view", () => {
    const block = {
      startTime: atCalendarTime("2026-06-01", 22),
      endTime: atCalendarTime("2026-06-02", 4),
    };
    expect(isSameDayTimeBlock(block)).toBe(false);
    expect(canDragTimeBlockInWeekView(block)).toBe(false);
    expect(
      canDragCalendarColumnBlockInWeekView(
        {
          startTimeIso: block.startTime.toISOString(),
          endTimeIso: block.endTime.toISOString(),
        },
        "Asia/Shanghai",
      ),
    ).toBe(false);
  });

  it("disallows multi-day blocks that span more than one calendar day", () => {
    const block = {
      startTime: atCalendarTime("2026-06-01", 9),
      endTime: atCalendarTime("2026-06-02", 9),
    };
    expect(canDragTimeBlockInWeekView(block)).toBe(false);
  });
});
