import type {
  ExistingTomorrowBlock,
  TomorrowPlanContext,
  TomorrowRoutineBlock,
} from "@/lib/assistant/tomorrow-plan-types";

export type BusyInterval = {
  source: "timeBlock" | "routine";
  title: string;
  startTime: string;
  endTime: string;
};

export type TimeInterval = { startMs: number; endMs: number };

export function toTimeInterval(startTime: string, endTime: string): TimeInterval | null {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  if (end.getTime() <= start.getTime()) {
    return null;
  }
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function busyIntervalFromExistingBlock(
  block: ExistingTomorrowBlock,
): BusyInterval {
  return {
    source: "timeBlock",
    title: block.title,
    startTime: block.startTime,
    endTime: block.endTime,
  };
}

export function busyIntervalFromRoutineBlock(
  block: TomorrowRoutineBlock,
): BusyInterval {
  return {
    source: "routine",
    title: block.title,
    startTime: block.startTime,
    endTime: block.endTime,
  };
}

export function getBusyIntervalsFromContext(
  context: Pick<TomorrowPlanContext, "existingBlocks" | "routineBlocks">,
): BusyInterval[] {
  return [
    ...context.existingBlocks.map(busyIntervalFromExistingBlock),
    ...context.routineBlocks.map(busyIntervalFromRoutineBlock),
  ].sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime() ||
      a.title.localeCompare(b.title),
  );
}

export function getBusyTimeIntervals(
  busy: Pick<BusyInterval, "startTime" | "endTime">[],
): TimeInterval[] {
  return busy
    .map((item) => toTimeInterval(item.startTime, item.endTime))
    .filter((interval): interval is TimeInterval => interval !== null);
}
