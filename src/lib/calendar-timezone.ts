/**
 * Calendar civil dates and day boundaries in a single IANA timezone.
 * User-facing pages pass explicit timeZone from getUserCalendarTimeZone().
 * getCalendarTimeZone() is legacy fallback for default parameters and non-migrated call sites.
 */

/** Fallback when no cookie/env; prefer UTC via resolveCalendarTimeZone in TZ-1. */
const LEGACY_DEFAULT_CALENDAR_TIMEZONE = "Asia/Shanghai";

/**
 * @deprecated Prefer getUserCalendarTimeZone() in Server Components.
 * Default parameter on calendar/stats helpers only — not used on /calendar, /dashboard, /review.
 */
export function getCalendarTimeZone(): string {
  return (
    process.env.NEXT_PUBLIC_CALENDAR_TIMEZONE?.trim() ||
    LEGACY_DEFAULT_CALENDAR_TIMEZONE
  );
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/** `YYYY-MM-DD` for the civil date of `instant` in `timeZone`. */
export function formatCalendarDateParamInTimeZone(
  instant: Date,
  timeZone: string = getCalendarTimeZone(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** UTC instant of local midnight on `dateParam` in `timeZone`. */
export function zonedStartOfCalendarDay(
  dateParam: string,
  timeZone: string = getCalendarTimeZone(),
): Date {
  const [year, month, day] = dateParam.split("-").map(Number);
  let utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  for (let i = 0; i < 24; i++) {
    const parts = getZonedParts(new Date(utcGuess), timeZone);
    const dayDiff =
      Date.UTC(parts.year, parts.month - 1, parts.day) -
      Date.UTC(year, month - 1, day);
    const timeOfDayMs =
      (parts.hour * 3600 + parts.minute * 60 + parts.second) * 1000;
    const offset = dayDiff + timeOfDayMs;
    if (offset === 0) {
      break;
    }
    utcGuess -= offset;
  }

  return new Date(utcGuess);
}

/** Exclusive end of civil day `dateParam` in `timeZone`. */
export function zonedEndOfCalendarDay(
  dateParam: string,
  timeZone: string = getCalendarTimeZone(),
): Date {
  return zonedStartOfCalendarDay(addCalendarDateParam(dateParam, 1), timeZone);
}

/** Add whole civil days to `YYYY-MM-DD` (no DST on the date string itself). */
export function addCalendarDateParam(dateParam: string, days: number): string {
  const [y, m, d] = dateParam.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Weekday index 0=Sun … 6=Sat in `timeZone` for civil date `dateParam`. */
export function getCalendarWeekday(
  dateParam: string,
  timeZone: string = getCalendarTimeZone(),
): number {
  const instant = zonedStartOfCalendarDay(dateParam, timeZone);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(instant);
  return WEEKDAY_SHORT_TO_INDEX[short] ?? 0;
}

export function getDayBoundsForDateParam(
  dateParam: string,
  timeZone: string = getCalendarTimeZone(),
): { dayStart: Date; dayEnd: Date } {
  return {
    dayStart: zonedStartOfCalendarDay(dateParam, timeZone),
    dayEnd: zonedEndOfCalendarDay(dateParam, timeZone),
  };
}
