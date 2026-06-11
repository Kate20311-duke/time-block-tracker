import { isNonEmptyTrimmed } from "@/lib/validation";
import type { RoutineInput, RoutineValidationError } from "./routine-types";

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TITLE_MAX_LENGTH = 100;

export function parseHHmmToMinutes(value: string): number | null {
  const match = value.trim().match(HH_MM_PATTERN);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isValidHHmm(value: string): boolean {
  return parseHHmmToMinutes(value) !== null;
}

export function isStartBeforeEnd(startTime: string, endTime: string): boolean {
  const start = parseHHmmToMinutes(startTime);
  const end = parseHHmmToMinutes(endTime);
  if (start === null || end === null) {
    return false;
  }
  return start < end;
}

export function normalizeDaysOfWeek(days: number[]): number[] {
  return [...new Set(days)].sort((a, b) => a - b);
}

export function isValidDaysOfWeek(days: number[]): boolean {
  if (days.length === 0) {
    return false;
  }
  const normalized = normalizeDaysOfWeek(days);
  if (normalized.length !== days.length) {
    return false;
  }
  return normalized.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

export function parseDateOnly(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function validateRoutineInput(
  input: RoutineInput,
): RoutineValidationError | null {
  const title = input.title.trim();

  if (!isNonEmptyTrimmed(title)) {
    return "empty_title";
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return "title_too_long";
  }
  if (!input.categoryId || !isNonEmptyTrimmed(input.categoryId)) {
    return "missing_category";
  }
  if (!isValidHHmm(input.startTime) || !isValidHHmm(input.endTime)) {
    return "invalid_time_format";
  }
  if (!isStartBeforeEnd(input.startTime, input.endTime)) {
    return "invalid_time_range";
  }
  if (!isValidDaysOfWeek(input.daysOfWeek)) {
    if (input.daysOfWeek.length === 0) {
      return "empty_days";
    }
    return "invalid_days";
  }
  if (Number.isNaN(input.startDate.getTime())) {
    return "invalid_start_date";
  }
  if (input.endDate !== null) {
    if (Number.isNaN(input.endDate.getTime())) {
      return "invalid_start_date";
    }
    if (input.endDate < input.startDate) {
      return "invalid_date_range";
    }
  }

  return null;
}

export const WEEKDAY_DAYS: number[] = [1, 2, 3, 4, 5];
export const EVERYDAY_DAYS: number[] = [0, 1, 2, 3, 4, 5, 6];
