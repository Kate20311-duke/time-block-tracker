import {
  formatCalendarDateParam,
  getDayQueryRange,
  minutesFromDayStartToDate,
} from "@/lib/calendar";
import { getCalendarWeekday } from "@/lib/calendar-timezone";
import type {
  RoutineForGenerate,
  RoutineGenerateCandidate,
  RoutineGenerateSkippedBlock,
  RoutineGenerateSkipReason,
} from "@/lib/routines/routine-generate-types";
import type { RoutineGenerateListItem } from "@/lib/routines/routine-types";
import { enumerateDateParams } from "@/lib/routines/routine-generate-range";
import { parseDateOnly, parseHHmmToMinutes } from "@/lib/routines/routine-validation";

export type TimeInterval = { startMs: number; endMs: number };

export type ExistingTimeBlock = {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
};

export function toInterval(start: Date, end: Date): TimeInterval | null {
  if (end.getTime() <= start.getTime()) {
    return null;
  }
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function routineAppliesOnDate(
  routine: Pick<RoutineForGenerate, "startDate" | "endDate">,
  dateParam: string,
  timeZone: string,
): boolean {
  const routineStart = formatCalendarDateParam(routine.startDate, timeZone);
  const routineEnd = routine.endDate
    ? formatCalendarDateParam(routine.endDate, timeZone)
    : null;

  if (dateParam < routineStart) {
    return false;
  }
  if (routineEnd && dateParam > routineEnd) {
    return false;
  }
  return true;
}

export function buildRoutineOccurrence(
  routine: RoutineForGenerate,
  dateParam: string,
  timeZone: string,
): RoutineGenerateCandidate | null {
  if (!routine.isActive) {
    return null;
  }
  if (!routineAppliesOnDate(routine, dateParam, timeZone)) {
    return null;
  }

  const dayOfWeek = getCalendarWeekday(dateParam, timeZone);
  if (!routine.daysOfWeek.includes(dayOfWeek)) {
    return null;
  }

  const startMinutes = parseHHmmToMinutes(routine.startTime);
  const endMinutes = parseHHmmToMinutes(routine.endTime);
  if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
    return null;
  }

  const { dayStart } = getDayQueryRange(dateParam, timeZone);
  const startTime = minutesFromDayStartToDate(startMinutes, dayStart, timeZone);
  const endTime = minutesFromDayStartToDate(endMinutes, dayStart, timeZone);

  if (endTime.getTime() <= startTime.getTime()) {
    return null;
  }

  const note = routine.notes
    ? `来自固定安排：${routine.title}\n${routine.notes}`
    : `来自固定安排：${routine.title}`;

  return {
    routineId: routine.id,
    title: routine.title,
    categoryId: routine.categoryId,
    date: dateParam,
    startTime,
    endTime,
    note,
  };
}

export function expandRoutineOccurrences(params: {
  routines: RoutineForGenerate[];
  startDate: string;
  endDate: string;
  timeZone: string;
}): RoutineGenerateCandidate[] {
  const dates = enumerateDateParams(params.startDate, params.endDate);
  const candidates: RoutineGenerateCandidate[] = [];

  for (const routine of params.routines) {
    for (const dateParam of dates) {
      const occurrence = buildRoutineOccurrence(routine, dateParam, params.timeZone);
      if (occurrence) {
        candidates.push(occurrence);
      }
    }
  }

  return candidates.sort(
    (a, b) =>
      a.startTime.getTime() - b.startTime.getTime() ||
      a.title.localeCompare(b.title),
  );
}

export function isDuplicateBlock(
  candidate: RoutineGenerateCandidate,
  existingBlocks: ExistingTimeBlock[],
): boolean {
  const startMs = candidate.startTime.getTime();
  const endMs = candidate.endTime.getTime();
  return existingBlocks.some(
    (block) =>
      block.title === candidate.title &&
      block.startTime.getTime() === startMs &&
      block.endTime.getTime() === endMs,
  );
}

export type ProcessCandidateResult =
  | { action: "create"; candidate: RoutineGenerateCandidate }
  | { action: "skip"; skipped: RoutineGenerateSkippedBlock };

export function processRoutineCandidate(params: {
  candidate: RoutineGenerateCandidate;
  categoryIds: Set<string>;
  existingBlocks: ExistingTimeBlock[];
  existingIntervals: TimeInterval[];
  batchIntervals: TimeInterval[];
}): ProcessCandidateResult {
  const { candidate } = params;
  const startIso = candidate.startTime.toISOString();
  const endIso = candidate.endTime.toISOString();

  const skip = (reason: RoutineGenerateSkipReason): ProcessCandidateResult => ({
    action: "skip",
    skipped: {
      title: candidate.title,
      routineId: candidate.routineId,
      date: candidate.date,
      startTime: startIso,
      endTime: endIso,
      reason,
    },
  });

  if (!candidate.categoryId) {
    return skip("missing_category");
  }
  if (!params.categoryIds.has(candidate.categoryId)) {
    return skip("invalid_category");
  }

  const interval = toInterval(candidate.startTime, candidate.endTime);
  if (!interval) {
    return skip("invalid_category");
  }

  if (isDuplicateBlock(candidate, params.existingBlocks)) {
    return skip("duplicate");
  }

  if (params.existingIntervals.some((existing) => intervalsOverlap(interval, existing))) {
    return skip("conflict_existing");
  }

  if (params.batchIntervals.some((accepted) => intervalsOverlap(interval, accepted))) {
    return skip("conflict_batch");
  }

  return { action: "create", candidate };
}

export function listItemToRoutineForGenerate(
  item: RoutineGenerateListItem,
): RoutineForGenerate {
  return {
    id: item.id,
    title: item.title,
    categoryId: item.categoryId,
    startTime: item.startTime,
    endTime: item.endTime,
    daysOfWeek: item.daysOfWeek,
    startDate: parseDateOnly(item.startDate) ?? new Date(Number.NaN),
    endDate: item.endDate ? parseDateOnly(item.endDate) : null,
    notes: null,
    isActive: item.isActive,
  };
}

export function estimateRoutineOccurrenceCount(params: {
  routines: RoutineGenerateListItem[];
  selectedRoutineIds: string[];
  startDate: string;
  endDate: string;
  timeZone: string;
}): number {
  const selected = new Set(params.selectedRoutineIds);
  const routines = params.routines
    .filter((routine) => routine.isActive && routine.categoryId && selected.has(routine.id))
    .map(listItemToRoutineForGenerate);

  return expandRoutineOccurrences({
    routines,
    startDate: params.startDate,
    endDate: params.endDate,
    timeZone: params.timeZone,
  }).length;
}
