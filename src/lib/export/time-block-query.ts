import type { Prisma } from "@/generated/prisma";
import {
  formatCalendarDateParamInTimeZone,
  zonedEndOfCalendarDay,
  zonedStartOfCalendarDay,
} from "@/lib/calendar-timezone";

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ExportDateRange = {
  fromParam: string;
  toParam: string;
  rangeStart: Date;
  rangeEnd: Date;
};

export type ParseExportDateRangeError = "invalid_from" | "invalid_to" | "invalid_range";

export type ParseExportDateRangeResult =
  | { ok: true; range: ExportDateRange }
  | { ok: false; error: ParseExportDateRangeError };

function isValidCalendarDateParam(param: string, timeZone: string): boolean {
  if (!DATE_PARAM_PATTERN.test(param)) {
    return false;
  }
  return (
    formatCalendarDateParamInTimeZone(
      zonedStartOfCalendarDay(param, timeZone),
      timeZone,
    ) === param
  );
}

/** First and last civil day of the month containing `now` in `timeZone`. */
export function defaultExportMonthRange(
  timeZone: string,
  now: Date = new Date(),
): { fromParam: string; toParam: string } {
  const todayParam = formatCalendarDateParamInTimeZone(now, timeZone);
  const [year, month] = todayParam.split("-").map(Number);
  const monthPadded = String(month).padStart(2, "0");
  const fromParam = `${year}-${monthPadded}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const toParam = `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`;
  return { fromParam, toParam };
}

/**
 * Parse optional `from` / `to` (`YYYY-MM-DD`) in the user's calendar timezone.
 * Defaults to the current calendar month when omitted.
 */
export function parseExportDateRange(
  fromInput: string | null | undefined,
  toInput: string | null | undefined,
  timeZone: string,
  now: Date = new Date(),
): ParseExportDateRangeResult {
  const defaults = defaultExportMonthRange(timeZone, now);
  const fromParam = fromInput?.trim() || defaults.fromParam;
  const toParam = toInput?.trim() || defaults.toParam;

  if (!isValidCalendarDateParam(fromParam, timeZone)) {
    return { ok: false, error: "invalid_from" };
  }
  if (!isValidCalendarDateParam(toParam, timeZone)) {
    return { ok: false, error: "invalid_to" };
  }

  const rangeStart = zonedStartOfCalendarDay(fromParam, timeZone);
  const rangeEnd = zonedEndOfCalendarDay(toParam, timeZone);

  if (rangeEnd.getTime() <= rangeStart.getTime()) {
    return { ok: false, error: "invalid_range" };
  }

  return {
    ok: true,
    range: { fromParam, toParam, rangeStart, rangeEnd },
  };
}

/** Overlap filter: blocks intersecting `[rangeStart, rangeEnd)` (exclusive end). */
export function buildTimeBlockOverlapWhere(
  rangeStart: Date,
  rangeEnd: Date,
): Pick<Prisma.TimeBlockWhereInput, "startTime" | "endTime"> {
  return {
    startTime: { lt: rangeEnd },
    endTime: { gt: rangeStart },
  };
}
