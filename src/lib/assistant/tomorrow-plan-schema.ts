import { getDayBoundsForDateParam } from "@/lib/calendar-timezone";
import {
  intervalsOverlap,
  toTimeInterval,
  type TimeInterval,
} from "@/lib/assistant/tomorrow-plan-busy";
import type {
  TomorrowPlanBlockDraft,
  TomorrowPlanContext,
  TomorrowPlanResult,
} from "@/lib/assistant/tomorrow-plan-types";
import {
  PLAN_BLOCK_MAX_COUNT,
  PLAN_BLOCK_MAX_MINUTES,
  PLAN_BLOCK_MIN_MINUTES,
} from "@/lib/assistant/tomorrow-plan-types";
import type { Locale } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n";

export class TomorrowPlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TomorrowPlanValidationError";
  }
}

type Interval = TimeInterval;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asNonEmptyString(item))
    .filter((item): item is string => item !== null);
}

function parseConfidence(value: unknown): TomorrowPlanBlockDraft["confidence"] {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function toInterval(startTime: string, endTime: string): Interval | null {
  return toTimeInterval(startTime, endTime);
}

export function parseTomorrowPlanJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new TomorrowPlanValidationError("Response is not valid JSON");
  }
}

export function validateTomorrowPlanResult(
  value: unknown,
  context: TomorrowPlanContext,
  locale: Locale = "zh",
): TomorrowPlanResult {
  const labels = getDictionary(locale).assistant;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TomorrowPlanValidationError("Root value is not an object");
  }

  const record = value as Record<string, unknown>;
  const summary = asNonEmptyString(record.summary);
  if (!summary) {
    throw new TomorrowPlanValidationError("summary is missing or empty");
  }

  const { dayStart, dayEnd } = getDayBoundsForDateParam(
    context.date,
    context.timezone,
  );
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  const categoryMap = new Map(
    context.categories.map((category) => [category.id, category.name]),
  );

  const existingIntervals: Interval[] = context.existingBlocks
    .map((block) => toInterval(block.startTime, block.endTime))
    .filter((interval): interval is Interval => interval !== null);

  const routineIntervals: Interval[] = context.routineBlocks
    .map((block) => toInterval(block.startTime, block.endTime))
    .filter((interval): interval is Interval => interval !== null);

  const warnings = asStringArray(record.warnings);
  let filteredConflict = 0;
  let filteredRoutineConflict = 0;
  let filteredInvalid = 0;
  let filteredCategory = 0;

  const accepted: TomorrowPlanBlockDraft[] = [];
  const acceptedIntervals: Interval[] = [];

  const rawBlocks = Array.isArray(record.suggestedBlocks)
    ? record.suggestedBlocks
    : [];

  for (const entry of rawBlocks) {
    if (!entry || typeof entry !== "object") {
      filteredInvalid++;
      continue;
    }
    const block = entry as Record<string, unknown>;
    const title = asNonEmptyString(block.title);
    const startTime = asNonEmptyString(block.startTime);
    const endTime = asNonEmptyString(block.endTime);
    const reason = asNonEmptyString(block.reason) ?? labels.tomorrowPlanDefaultReason;

    if (!title || !startTime || !endTime) {
      filteredInvalid++;
      continue;
    }

    const interval = toInterval(startTime, endTime);
    if (!interval) {
      filteredInvalid++;
      continue;
    }

    if (
      interval.startMs < dayStartMs ||
      interval.endMs > dayEndMs ||
      interval.startMs >= dayEndMs
    ) {
      filteredInvalid++;
      continue;
    }

    const minutes = durationMinutes(
      new Date(startTime),
      new Date(endTime),
    );
    if (minutes < PLAN_BLOCK_MIN_MINUTES || minutes > PLAN_BLOCK_MAX_MINUTES) {
      filteredInvalid++;
      continue;
    }

    const conflictsExisting = existingIntervals.some((existing) =>
      intervalsOverlap(interval, existing),
    );
    const conflictsRoutine = routineIntervals.some((routineInterval) =>
      intervalsOverlap(interval, routineInterval),
    );
    const conflictsAccepted = acceptedIntervals.some((acceptedInterval) =>
      intervalsOverlap(interval, acceptedInterval),
    );
    if (conflictsExisting || conflictsAccepted) {
      filteredConflict++;
      continue;
    }
    if (conflictsRoutine) {
      filteredRoutineConflict++;
      continue;
    }

    let categoryId: string | null = null;
    let categoryName: string | null = null;
    const rawCategoryId = asNonEmptyString(block.categoryId);
    if (rawCategoryId && categoryMap.has(rawCategoryId)) {
      categoryId = rawCategoryId;
      categoryName = categoryMap.get(rawCategoryId) ?? null;
    } else if (rawCategoryId) {
      filteredCategory++;
      categoryId = null;
      categoryName = null;
    }

    accepted.push({
      title,
      categoryId,
      categoryName,
      startTime,
      endTime,
      reason,
      confidence: parseConfidence(block.confidence),
    });
    acceptedIntervals.push(interval);

    if (accepted.length >= PLAN_BLOCK_MAX_COUNT) break;
  }

  if (filteredConflict > 0) {
    warnings.push(labels.tomorrowPlanWarningFilteredConflict);
  }
  if (filteredRoutineConflict > 0) {
    warnings.push(labels.tomorrowPlanWarningFilteredRoutineConflict);
  }
  if (filteredCategory > 0) {
    warnings.push(labels.tomorrowPlanWarningFilteredCategory);
  }
  if (filteredInvalid > 0) {
    warnings.push(labels.tomorrowPlanWarningFilteredInvalid);
  }

  return {
    date: context.date,
    summary,
    assumptions: asStringArray(record.assumptions),
    suggestedBlocks: accepted,
    warnings,
  };
}
