import { zonedStartOfCalendarDay } from "@/lib/calendar-timezone";

const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Whether `value` matches the `datetime-local` wire format (no offset). */
export function isDatetimeLocalValue(value: string): boolean {
  return DATETIME_LOCAL_PATTERN.test(value.trim());
}

/**
 * Parse a UTC ISO string from the client (e.g. `toISOString()`).
 * Returns null for empty or invalid input.
 */
export function parseUtcIsoString(iso: string): Date | null {
  const trimmed = iso.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Browser-only: interpret a `datetime-local` value as the user's local wall time
 * and return a UTC ISO string. Uses `new Date(value)` (local TZ in the browser).
 */
export function datetimeLocalValueToUtcIso(value: string): string | null {
  if (!isDatetimeLocalValue(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Format a UTC instant for `datetime-local` defaultValue in an IANA timezone. */
export function instantToDatetimeLocalValue(
  instant: Date | string,
  timeZone: string,
): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

/**
 * Wall clock on civil date `dateParam` (`YYYY-MM-DD`) in `timeZone` → UTC ISO.
 * Used in unit tests (deterministic, no browser local TZ).
 */
export function wallTimeInTimeZoneToUtcIso(
  dateParam: string,
  hour: number,
  minute: number,
  timeZone: string,
): string {
  const dayStart = zonedStartOfCalendarDay(dateParam, timeZone);
  return new Date(
    dayStart.getTime() + (hour * 60 + minute) * 60_000,
  ).toISOString();
}
