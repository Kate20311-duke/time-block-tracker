import {
  MINUTES_PER_DAY,
  dateToMinutesFromDayStart,
  formatCalendarDateParam,
  minutesFromDayStartToDate,
  parseCalendarDateParam,
  pixelYToMinutes,
  snapMinutes,
} from "@/lib/calendar";

/** Default duration when creating a block from an empty calendar slot click. */
export const CALENDAR_CREATE_DEFAULT_DURATION_MINUTES = 30;

/** Default start hour for toolbar "new block" on non-today days. */
const DEFAULT_CREATE_START_HOUR = 9;

export type CalendarSlotTimes = {
  startTimeIso: string;
  endTimeIso: string;
};

/**
 * Map a click Y inside the day column grid to snapped start/end instants (UTC ISO).
 * End time is start + {@link CALENDAR_CREATE_DEFAULT_DURATION_MINUTES}, clamped to the day.
 */
export function slotTimesFromGridClick(
  calendarDate: string,
  pointerYInGrid: number,
  containerHeightPx: number,
  timeZone: string,
  defaultDurationMinutes: number = CALENDAR_CREATE_DEFAULT_DURATION_MINUTES,
): CalendarSlotTimes | null {
  const selectedDay = parseCalendarDateParam(calendarDate, timeZone);
  const startMinutes = snapMinutes(
    pixelYToMinutes(pointerYInGrid, containerHeightPx),
  );
  const endMinutes = Math.min(
    MINUTES_PER_DAY,
    startMinutes + defaultDurationMinutes,
  );

  if (endMinutes <= startMinutes) {
    return null;
  }

  const start = minutesFromDayStartToDate(startMinutes, selectedDay, timeZone);
  const end = minutesFromDayStartToDate(endMinutes, selectedDay, timeZone);

  return {
    startTimeIso: start.toISOString(),
    endTimeIso: end.toISOString(),
  };
}

/**
 * Default slot for toolbar "new time block" — 9:00 on past/future days;
 * snapped current time on today (falls back to 9:00 before 9am).
 */
export function defaultSlotTimesForDay(
  calendarDate: string,
  timeZone: string,
  now: Date = new Date(),
  defaultDurationMinutes: number = CALENDAR_CREATE_DEFAULT_DURATION_MINUTES,
): CalendarSlotTimes {
  const selectedDay = parseCalendarDateParam(calendarDate, timeZone);
  const todayKey = formatCalendarDateParam(now, timeZone);
  const isToday = calendarDate === todayKey;

  let startMinutes = DEFAULT_CREATE_START_HOUR * 60;
  if (isToday) {
    startMinutes = Math.max(
      DEFAULT_CREATE_START_HOUR * 60,
      snapMinutes(dateToMinutesFromDayStart(now, selectedDay, timeZone)),
    );
  }

  const endMinutes = Math.min(
    MINUTES_PER_DAY,
    startMinutes + defaultDurationMinutes,
  );
  const start = minutesFromDayStartToDate(startMinutes, selectedDay, timeZone);
  const end = minutesFromDayStartToDate(endMinutes, selectedDay, timeZone);

  return {
    startTimeIso: start.toISOString(),
    endTimeIso: end.toISOString(),
  };
}
