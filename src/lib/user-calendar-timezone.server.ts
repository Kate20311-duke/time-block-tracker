import "server-only";

import { cookies } from "next/headers";
import {
  CALENDAR_TIMEZONE_COOKIE,
  resolveCalendarTimeZone,
} from "@/lib/user-calendar-timezone";

/**
 * Server-only: read the user's calendar timezone from cookie (set in the browser).
 * Fallback: NEXT_PUBLIC_CALENDAR_TIMEZONE, then UTC.
 */
export async function getUserCalendarTimeZone(): Promise<string> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(CALENDAR_TIMEZONE_COOKIE)?.value;
  return resolveCalendarTimeZone(fromCookie);
}
