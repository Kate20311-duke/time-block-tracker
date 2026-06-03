import {
  endOfDay,
  endOfWeekMonday,
  getDayQueryRange,
  getWeekQueryRange,
  startOfDay,
  startOfWeekMonday,
} from "@/lib/calendar";
import { formatCalendarDateParamInTimeZone } from "@/lib/calendar-timezone";

export type DashboardDateRanges = {
  /** Inclusive UTC instant of local today 00:00. */
  todayStart: Date;
  /** Exclusive UTC instant of local tomorrow 00:00. */
  todayEnd: Date;
  /** Inclusive UTC instant of local Monday 00:00 (week containing `now`). */
  weekStart: Date;
  /** Exclusive UTC instant of next Monday 00:00. */
  weekEnd: Date;
};

/**
 * Dashboard date ranges in the user's calendar timezone (same as `/calendar`).
 * Week: Monday 00:00 inclusive → next Monday 00:00 exclusive.
 */
export function getDashboardDateRanges(
  now: Date = new Date(),
  timeZone: string,
): DashboardDateRanges {
  const todayParam = formatCalendarDateParamInTimeZone(now, timeZone);
  const { dayStart, dayEnd } = getDayQueryRange(todayParam, timeZone);
  const { weekStart, weekEnd } = getWeekQueryRange(
    startOfDay(now, timeZone),
    timeZone,
  );
  return {
    todayStart: dayStart,
    todayEnd: dayEnd,
    weekStart,
    weekEnd,
  };
}

export function startOfToday(
  now: Date = new Date(),
  timeZone: string,
): Date {
  return startOfDay(now, timeZone);
}

export function endOfToday(now: Date = new Date(), timeZone: string): Date {
  return endOfDay(now, timeZone);
}

export function startOfCurrentWeek(
  now: Date = new Date(),
  timeZone: string,
): Date {
  return startOfWeekMonday(now, timeZone);
}

export function endOfCurrentWeek(
  now: Date = new Date(),
  timeZone: string,
): Date {
  return endOfWeekMonday(now, timeZone);
}
