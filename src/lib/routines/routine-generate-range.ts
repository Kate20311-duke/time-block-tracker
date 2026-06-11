import {
  addCalendarDays,
  formatCalendarDateParam,
  startOfWeekMonday,
} from "@/lib/calendar";
import {
  addCalendarDateParam,
  zonedStartOfCalendarDay,
} from "@/lib/calendar-timezone";
import {
  MAX_GENERATE_DAYS,
  type RoutineGenerateRangeError,
  type RoutineGenerateRangePreset,
} from "@/lib/routines/routine-generate-types";
import { parseDateOnly } from "@/lib/routines/routine-validation";

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateParam(value: string): boolean {
  const trimmed = value.trim();
  if (!DATE_PARAM_PATTERN.test(trimmed)) {
    return false;
  }
  return parseDateOnly(trimmed) !== null;
}

export function enumerateDateParams(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addCalendarDateParam(current, 1);
  }
  return dates;
}

export function countInclusiveDays(startDate: string, endDate: string): number {
  return enumerateDateParams(startDate, endDate).length;
}

export function validateGenerateDateRange(
  startDate: string,
  endDate: string,
): RoutineGenerateRangeError | null {
  if (!isValidDateParam(startDate) || !isValidDateParam(endDate)) {
    return "invalid_date";
  }
  if (startDate > endDate) {
    return "invalid_range";
  }
  if (countInclusiveDays(startDate, endDate) > MAX_GENERATE_DAYS) {
    return "range_too_long";
  }
  return null;
}

export function resolvePresetRange(
  preset: Exclude<RoutineGenerateRangePreset, "custom">,
  timeZone: string,
  now: Date = new Date(),
): { startDate: string; endDate: string } {
  const todayParam = formatCalendarDateParam(now, timeZone);

  if (preset === "next7") {
    return {
      startDate: todayParam,
      endDate: addCalendarDateParam(todayParam, 6),
    };
  }

  if (preset === "thisWeek") {
    const weekStart = startOfWeekMonday(
      zonedStartOfCalendarDay(todayParam, timeZone),
      timeZone,
    );
    const startDate = formatCalendarDateParam(weekStart, timeZone);
    return {
      startDate,
      endDate: addCalendarDateParam(startDate, 6),
    };
  }

  const nextWeekStart = addCalendarDays(
    startOfWeekMonday(zonedStartOfCalendarDay(todayParam, timeZone), timeZone),
    7,
    timeZone,
  );
  const startDate = formatCalendarDateParam(nextWeekStart, timeZone);
  return {
    startDate,
    endDate: addCalendarDateParam(startDate, 6),
  };
}
