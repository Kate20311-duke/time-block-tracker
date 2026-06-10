import { addCalendarDays, endOfDay, startOfDay } from "@/lib/calendar";
import {
  formatCalendarDateParamInTimeZone,
  zonedStartOfCalendarDay,
} from "@/lib/calendar-timezone";

export const MAX_TIME_REVIEW_RANGE_DAYS = 90;
export const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ReviewRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "custom";

export type ReviewRangeParams = {
  startDate: string;
  endDate: string;
};

export type ReviewRangeValidationError =
  | "invalid_date"
  | "start_after_end"
  | "range_too_long";

export function formatDateParamInTimeZone(
  date: Date,
  timeZone: string,
): string {
  return formatCalendarDateParamInTimeZone(date, timeZone);
}

export function getTodayDateParam(
  timeZone: string,
  now: Date = new Date(),
): string {
  return formatDateParamInTimeZone(now, timeZone);
}

export function resolvePresetRange(
  preset: ReviewRangePreset,
  timeZone: string,
  custom?: ReviewRangeParams,
  now: Date = new Date(),
): ReviewRangeParams {
  const todayParam = getTodayDateParam(timeZone, now);
  const todayStart = startOfDay(now, timeZone);

  switch (preset) {
    case "today":
      return { startDate: todayParam, endDate: todayParam };
    case "yesterday": {
      const yesterday = addCalendarDays(todayStart, -1, timeZone);
      const yesterdayParam = formatDateParamInTimeZone(yesterday, timeZone);
      return { startDate: yesterdayParam, endDate: yesterdayParam };
    }
    case "last7": {
      const start = addCalendarDays(todayStart, -6, timeZone);
      return {
        startDate: formatDateParamInTimeZone(start, timeZone),
        endDate: todayParam,
      };
    }
    case "last30": {
      const start = addCalendarDays(todayStart, -29, timeZone);
      return {
        startDate: formatDateParamInTimeZone(start, timeZone),
        endDate: todayParam,
      };
    }
    case "custom":
      return custom ?? resolvePresetRange("last7", timeZone, undefined, now);
  }
}

export function countInclusiveCalendarDays(
  startDate: string,
  endDate: string,
  timeZone: string,
): number {
  let count = 0;
  let day = zonedStartOfCalendarDay(startDate, timeZone);
  const endDay = zonedStartOfCalendarDay(endDate, timeZone);

  while (day.getTime() <= endDay.getTime()) {
    count++;
    day = addCalendarDays(day, 1, timeZone);
  }

  return count;
}

export function validateReviewRangeParams(
  startDate: string,
  endDate: string,
  timeZone: string,
): { ok: true } | { ok: false; error: ReviewRangeValidationError } {
  if (!DATE_PARAM_PATTERN.test(startDate) || !DATE_PARAM_PATTERN.test(endDate)) {
    return { ok: false, error: "invalid_date" };
  }

  const start = zonedStartOfCalendarDay(startDate, timeZone);
  const end = zonedStartOfCalendarDay(endDate, timeZone);
  if (start.getTime() > end.getTime()) {
    return { ok: false, error: "start_after_end" };
  }

  const days = countInclusiveCalendarDays(startDate, endDate, timeZone);
  if (days > MAX_TIME_REVIEW_RANGE_DAYS) {
    return { ok: false, error: "range_too_long" };
  }

  return { ok: true };
}

/** Convert YYYY-MM-DD params to query instants (overlap with Dashboard rolling range). */
export function resolveQueryRange(
  startDate: string,
  endDate: string,
  timeZone: string,
  now: Date = new Date(),
): { rangeStart: Date; rangeEnd: Date } {
  const rangeStart = startOfDay(
    zonedStartOfCalendarDay(startDate, timeZone),
    timeZone,
  );
  const todayParam = getTodayDateParam(timeZone, now);

  const rangeEnd =
    endDate === todayParam
      ? now
      : endOfDay(zonedStartOfCalendarDay(endDate, timeZone), timeZone);

  return { rangeStart, rangeEnd };
}

export function defaultLastSevenDayParams(
  timeZone: string,
  now: Date = new Date(),
): ReviewRangeParams {
  return resolvePresetRange("last7", timeZone, undefined, now);
}

export function rangesEqual(
  a: ReviewRangeParams,
  b: ReviewRangeParams,
): boolean {
  return a.startDate === b.startDate && a.endDate === b.endDate;
}
