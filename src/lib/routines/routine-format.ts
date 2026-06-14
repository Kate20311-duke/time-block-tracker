import type { Locale } from "@/lib/i18n/types";
import { formatCalendarDateParamInTimeZone } from "@/lib/calendar-timezone";
import { EVERYDAY_DAYS, WEEKDAY_DAYS, normalizeDaysOfWeek } from "./routine-validation";

const DAY_LABELS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;
const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function getDayLabels(locale: Locale): readonly string[] {
  return locale === "zh" ? DAY_LABELS_ZH : DAY_LABELS_EN;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

export function formatDaysOfWeek(
  days: number[],
  locale: Locale,
  labels: {
    weekdays: string;
    everyday: string;
  },
): string {
  const normalized = normalizeDaysOfWeek(days);
  if (arraysEqual(normalized, WEEKDAY_DAYS)) {
    return labels.weekdays;
  }
  if (arraysEqual(normalized, EVERYDAY_DAYS)) {
    return labels.everyday;
  }

  const dayLabels = getDayLabels(locale);
  if (locale === "zh") {
    if (normalized.length === 7) {
      return labels.everyday;
    }
    const isConsecutive =
      normalized.length > 1 &&
      normalized.every(
        (day, index) => index === 0 || day === normalized[index - 1] + 1,
      );
    if (isConsecutive) {
      return `${dayLabels[normalized[0]]}至${dayLabels[normalized[normalized.length - 1]]}`;
    }
    return normalized.map((day) => dayLabels[day]).join("、");
  }

  if (normalized.length === 7) {
    return labels.everyday;
  }
  const isConsecutive =
    normalized.length > 1 &&
    normalized.every(
      (day, index) => index === 0 || day === normalized[index - 1] + 1,
    );
  if (isConsecutive) {
    return `${dayLabels[normalized[0]]}–${dayLabels[normalized[normalized.length - 1]]}`;
  }
  return normalized.map((day) => dayLabels[day]).join(", ");
}

export function formatDateOnly(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayDateInputValue(): string {
  return toDateInputValue(new Date());
}

/** Today as `YYYY-MM-DD` in the user's calendar timezone. */
export function todayDateInputValueInTimeZone(timeZone: string): string {
  return formatCalendarDateParamInTimeZone(new Date(), timeZone);
}
