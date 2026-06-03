import {
  formatCalendarDateParamInTimeZone,
  getCalendarTimeZone,
} from "@/lib/calendar-timezone";
import type { TimeRange } from "@/lib/calendar";

/**
 * Week-view drag gate (Phase 9.6): same-day blocks only; column-local vertical move.
 * Cross-midnight / multi-day blocks stay non-draggable in week view.
 */
export function isSameDayTimeBlock(
  block: TimeRange,
  timeZone: string = getCalendarTimeZone(),
): boolean {
  return (
    formatCalendarDateParamInTimeZone(block.startTime, timeZone) ===
    formatCalendarDateParamInTimeZone(block.endTime, timeZone)
  );
}

/** Whether a TimeBlock may be dragged in week view (same calendar day start/end). */
export function canDragTimeBlockInWeekView(
  block: TimeRange,
  timeZone: string = getCalendarTimeZone(),
): boolean {
  return isSameDayTimeBlock(block, timeZone);
}

/** Week column block payload (ISO strings from server). */
export function canDragCalendarColumnBlockInWeekView(
  block: {
    startTimeIso: string;
    endTimeIso: string;
  },
  timeZone: string,
): boolean {
  return canDragTimeBlockInWeekView(
    {
      startTime: new Date(block.startTimeIso),
      endTime: new Date(block.endTimeIso),
    },
    timeZone,
  );
}
