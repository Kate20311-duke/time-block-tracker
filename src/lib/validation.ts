import {
  TIME_BLOCK_STATUSES,
  TIME_BLOCK_EFFICIENCY_LEVELS,
  FOCUS_SESSION_MODES,
  FOCUS_SESSION_STATUSES,
  type TimeBlockStatus,
  type TimeBlockEfficiencyLevel,
  type FocusSessionStatus,
  type FocusSessionMode,
} from "@/lib/constants";

export function isNonEmptyTrimmed(value: string): boolean {
  return value.trim().length > 0;
}

export function clampCompletionLevel(level: number): number {
  return Math.min(100, Math.max(0, Math.round(level)));
}

export function getValidTimeBlockRange(
  start: Date | null,
  end: Date | null,
): { start: Date; end: Date } | null {
  if (start !== null && end !== null && end > start) {
    return { start, end };
  }
  return null;
}

export function isValidTimeBlockStatus(
  status: string,
): status is TimeBlockStatus {
  return (TIME_BLOCK_STATUSES as readonly string[]).includes(status);
}

export function isValidTimeBlockEfficiencyLevel(
  level: string,
): level is TimeBlockEfficiencyLevel {
  return (TIME_BLOCK_EFFICIENCY_LEVELS as readonly string[]).includes(level);
}

export type TimeBlockCreateError =
  | "missing_fields"
  | "invalid_range"
  | "invalid_status"
  | "invalid_completion"
  | "invalid_efficiency";

export function validateTimeBlockCreate(input: {
  title: string;
  categoryId: string;
  startTime: Date | null;
  endTime: Date | null;
  status: string;
  completionLevel: number;
  efficiencyLevel?: string | null;
}): TimeBlockCreateError | null {
  if (!isNonEmptyTrimmed(input.title) || !isNonEmptyTrimmed(input.categoryId)) {
    return "missing_fields";
  }
  if (!input.startTime || !input.endTime) {
    return "missing_fields";
  }
  if (!getValidTimeBlockRange(input.startTime, input.endTime)) {
    return "invalid_range";
  }
  if (!isValidTimeBlockStatus(input.status)) {
    return "invalid_status";
  }
  if (
    Number.isNaN(input.completionLevel) ||
    input.completionLevel < 0 ||
    input.completionLevel > 100
  ) {
    return "invalid_completion";
  }
  const efficiencyRaw = String(input.efficiencyLevel ?? "").trim();
  if (efficiencyRaw && !isValidTimeBlockEfficiencyLevel(efficiencyRaw)) {
    return "invalid_efficiency";
  }
  return null;
}

export function isValidFocusSessionStatus(
  status: string,
): status is FocusSessionStatus {
  return (FOCUS_SESSION_STATUSES as readonly string[]).includes(status);
}

export function isValidFocusSessionMode(
  mode: string,
): mode is FocusSessionMode {
  return (FOCUS_SESSION_MODES as readonly string[]).includes(mode);
}

export type FocusSessionValidationError =
  | "missing_fields"
  | "invalid_category"
  | "invalid_planned_duration"
  | "invalid_range"
  | "invalid_status";

export function validateFocusSessionPlannedDuration(
  plannedDurationMinutes: number,
): FocusSessionValidationError | null {
  if (
    Number.isNaN(plannedDurationMinutes) ||
    !Number.isFinite(plannedDurationMinutes) ||
    plannedDurationMinutes <= 0
  ) {
    return "invalid_planned_duration";
  }
  return null;
}

export function validateFocusSessionTimeRange(
  startTime: Date | null,
  endTime: Date | null,
): FocusSessionValidationError | null {
  if (endTime === null) {
    return null;
  }
  if (startTime === null) {
    return "missing_fields";
  }
  if (!getValidTimeBlockRange(startTime, endTime)) {
    return "invalid_range";
  }
  return null;
}

export function validateFocusSessionCreate(input: {
  categoryId: string;
  plannedDurationMinutes: number;
  startTime: Date | null;
  endTime?: Date | null;
  status?: string;
  mode?: string;
}): FocusSessionValidationError | null {
  if (!isNonEmptyTrimmed(input.categoryId)) {
    return "invalid_category";
  }
  const durationError = validateFocusSessionPlannedDuration(
    input.plannedDurationMinutes,
  );
  if (durationError) {
    return durationError;
  }
  if (!input.startTime) {
    return "missing_fields";
  }
  const rangeError = validateFocusSessionTimeRange(
    input.startTime,
    input.endTime ?? null,
  );
  if (rangeError) {
    return rangeError;
  }
  if (input.status && !isValidFocusSessionStatus(input.status)) {
    return "invalid_status";
  }
  if (input.mode && !isValidFocusSessionMode(input.mode)) {
    return "invalid_status";
  }
  return null;
}
