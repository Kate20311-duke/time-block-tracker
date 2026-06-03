/**
 * Per-user calendar timezone (TZ-1).
 * Browser writes `calendar_time_zone` cookie; server reads it via getUserCalendarTimeZone().
 * Calendar, dashboard, and review use getUserCalendarTimeZone().
 */

/** Cookie set by TimezoneInitializer (client). */
export const CALENDAR_TIMEZONE_COOKIE = "calendar_time_zone";

const FALLBACK_TIMEZONE = "UTC";

/** sessionStorage key: last browser TZ we already refreshed the RSC tree for. */
export const CALENDAR_TZ_REFRESH_SESSION_KEY = "calendar_tz_refresh_for";

/** Validate IANA timezone id (e.g. America/New_York). */
export function isValidIanaTimeZone(timeZone: string): boolean {
  const trimmed = timeZone.trim();
  if (!trimmed || trimmed.length > 64) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve calendar timezone: cookie → NEXT_PUBLIC_CALENDAR_TIMEZONE → UTC.
 * Pure function for tests and server cookie resolution.
 */
export function resolveCalendarTimeZone(cookieValue?: string | null): string {
  if (cookieValue && isValidIanaTimeZone(cookieValue)) {
    return cookieValue.trim();
  }

  const fromEnv = process.env.NEXT_PUBLIC_CALENDAR_TIMEZONE?.trim();
  if (fromEnv && isValidIanaTimeZone(fromEnv)) {
    return fromEnv;
  }

  return FALLBACK_TIMEZONE;
}
