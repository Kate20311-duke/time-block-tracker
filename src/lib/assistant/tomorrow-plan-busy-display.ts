import { getDayQueryRange, minutesFromDayStartToDate } from "@/lib/calendar";
import {
  intervalsOverlap,
  toTimeInterval,
  type TimeInterval,
} from "@/lib/assistant/tomorrow-plan-busy";
import type {
  ExistingTomorrowBlock,
  TomorrowRoutineBlock,
} from "@/lib/assistant/tomorrow-plan-types";
import { parseHHmmToMinutes } from "@/lib/routines/routine-validation";

export type DisplayBusyBlock = {
  key: string;
  title: string;
  startTime: string;
  endTime: string;
  sources: ("timeBlock" | "routine")[];
  categoryName?: string | null;
};

export type AvailableWindow = {
  startTime: string;
  endTime: string;
  minutes: number;
};

export type DisplayBusySourceLabels = {
  calendar: string;
  routine: string;
  both: string;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function makeMergeKey(
  startTime: string,
  endTime: string,
  title: string,
): string {
  return `${startTime}|${endTime}|${normalizeTitle(title)}`;
}

function addSource(
  sources: ("timeBlock" | "routine")[],
  source: "timeBlock" | "routine",
): ("timeBlock" | "routine")[] {
  if (sources.includes(source)) {
    return sources;
  }
  return [...sources, source];
}

export function mergeBusyBlocksForDisplay(params: {
  existingBlocks: ExistingTomorrowBlock[];
  routineBlocks: TomorrowRoutineBlock[];
}): DisplayBusyBlock[] {
  const map = new Map<string, DisplayBusyBlock>();

  for (const block of params.existingBlocks) {
    const key = makeMergeKey(block.startTime, block.endTime, block.title);
    const existing = map.get(key);
    if (existing) {
      existing.sources = addSource(existing.sources, "timeBlock");
      if (existing.categoryName == null && block.categoryName != null) {
        existing.categoryName = block.categoryName;
      }
    } else {
      map.set(key, {
        key,
        title: block.title,
        startTime: block.startTime,
        endTime: block.endTime,
        sources: ["timeBlock"],
        categoryName: block.categoryName,
      });
    }
  }

  for (const block of params.routineBlocks) {
    const key = makeMergeKey(block.startTime, block.endTime, block.title);
    const existing = map.get(key);
    if (existing) {
      existing.sources = addSource(existing.sources, "routine");
      if (existing.categoryName == null && block.categoryName != null) {
        existing.categoryName = block.categoryName;
      }
    } else {
      map.set(key, {
        key,
        title: block.title,
        startTime: block.startTime,
        endTime: block.endTime,
        sources: ["routine"],
        categoryName: block.categoryName,
      });
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime() ||
      a.title.localeCompare(b.title),
  );
}

export function formatDisplayBusySources(
  sources: ("timeBlock" | "routine")[],
  labels: DisplayBusySourceLabels,
): string {
  const hasCalendar = sources.includes("timeBlock");
  const hasRoutine = sources.includes("routine");
  if (hasCalendar && hasRoutine) {
    return labels.both;
  }
  if (hasCalendar) {
    return labels.calendar;
  }
  if (hasRoutine) {
    return labels.routine;
  }
  return labels.calendar;
}

function mergeOverlappingIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  const merged: TimeInterval[] = [{ ...sorted[0]! }];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index]!;
    const last = merged[merged.length - 1]!;
    if (current.startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, current.endMs);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

export function getAvailableWindows(params: {
  busyBlocks: DisplayBusyBlock[];
  date: string;
  timeZone: string;
  dayStart?: string;
  dayEnd?: string;
  minMinutes?: number;
}): AvailableWindow[] {
  const {
    busyBlocks,
    date,
    timeZone,
    dayStart = "07:00",
    dayEnd = "23:00",
    minMinutes = 30,
  } = params;

  const startMinutes = parseHHmmToMinutes(dayStart);
  const endMinutes = parseHHmmToMinutes(dayEnd);
  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes >= endMinutes
  ) {
    return [];
  }

  const { dayStart: calendarDayStart } = getDayQueryRange(date, timeZone);
  const windowStart = minutesFromDayStartToDate(
    startMinutes,
    calendarDayStart,
    timeZone,
  );
  const windowEnd = minutesFromDayStartToDate(
    endMinutes,
    calendarDayStart,
    timeZone,
  );
  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();

  const clippedBusy = busyBlocks
    .map((block) => toTimeInterval(block.startTime, block.endTime))
    .filter((interval): interval is TimeInterval => interval !== null)
    .map((interval) => ({
      startMs: Math.max(interval.startMs, windowStartMs),
      endMs: Math.min(interval.endMs, windowEndMs),
    }))
    .filter((interval) => interval.endMs > interval.startMs);

  const mergedBusy = mergeOverlappingIntervals(clippedBusy);
  const windows: AvailableWindow[] = [];
  let cursor = windowStartMs;

  for (const busy of mergedBusy) {
    if (busy.startMs > cursor) {
      const minutes = Math.round((busy.startMs - cursor) / 60_000);
      if (minutes >= minMinutes) {
        windows.push({
          startTime: new Date(cursor).toISOString(),
          endTime: new Date(busy.startMs).toISOString(),
          minutes,
        });
      }
    }
    cursor = Math.max(cursor, busy.endMs);
  }

  if (windowEndMs > cursor) {
    const minutes = Math.round((windowEndMs - cursor) / 60_000);
    if (minutes >= minMinutes) {
      windows.push({
        startTime: new Date(cursor).toISOString(),
        endTime: new Date(windowEndMs).toISOString(),
        minutes,
      });
    }
  }

  return windows;
}

/** @internal Exported for tests verifying overlap semantics. */
export function busyBlocksOverlap(
  a: Pick<DisplayBusyBlock, "startTime" | "endTime">,
  b: Pick<DisplayBusyBlock, "startTime" | "endTime">,
): boolean {
  const intervalA = toTimeInterval(a.startTime, a.endTime);
  const intervalB = toTimeInterval(b.startTime, b.endTime);
  if (!intervalA || !intervalB) {
    return false;
  }
  return intervalsOverlap(intervalA, intervalB);
}
