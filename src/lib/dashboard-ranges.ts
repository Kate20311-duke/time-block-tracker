import { endOfDay, endOfWeekMonday, startOfDay, startOfWeekMonday } from "@/lib/calendar";

export type DashboardDateRanges = {
  todayStart: Date;
  todayEnd: Date; // exclusive
  weekStart: Date;
  weekEnd: Date; // exclusive
};

/**
 * Dashboard date convention:
 * - Local time
 * - Week starts on Monday 00:00, ends next Monday 00:00 (exclusive)
 */
export function getDashboardDateRanges(now: Date = new Date()): DashboardDateRanges {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeekMonday(now);
  const weekEnd = endOfWeekMonday(now);
  return { todayStart, todayEnd, weekStart, weekEnd };
}

export function startOfToday(now: Date = new Date()): Date {
  return startOfDay(now);
}

export function endOfToday(now: Date = new Date()): Date {
  return endOfDay(now);
}

export function startOfCurrentWeek(now: Date = new Date()): Date {
  return startOfWeekMonday(now);
}

export function endOfCurrentWeek(now: Date = new Date()): Date {
  return endOfWeekMonday(now);
}

