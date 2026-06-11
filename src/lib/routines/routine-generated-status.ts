import {
  expandRoutineOccurrences,
  isDuplicateBlock,
  listItemToRoutineForGenerate,
  type ExistingTimeBlock,
} from "@/lib/routines/routine-generate";
import type { RoutineGenerateListItem } from "@/lib/routines/routine-types";

export type ExistingBlockLike = {
  title: string;
  startTime: Date;
  endTime: Date;
};

export type RoutineGeneratedStatus = {
  expectedCount: number;
  existingCount: number;
  missingCount: number;
};

export type RoutineGeneratedStatusLabels = {
  all: string;
  none: string;
  partial: string;
  noDates: string;
};

export function estimateRoutineGeneratedStatus(params: {
  routine: RoutineGenerateListItem;
  existingBlocks: ExistingBlockLike[];
  startDate: string;
  endDate: string;
  timeZone: string;
}): RoutineGeneratedStatus {
  const routineForGenerate = listItemToRoutineForGenerate(params.routine);
  const occurrences = expandRoutineOccurrences({
    routines: [routineForGenerate],
    startDate: params.startDate,
    endDate: params.endDate,
    timeZone: params.timeZone,
  });

  const expectedCount = occurrences.length;
  const existingBlocks: ExistingTimeBlock[] = params.existingBlocks.map(
    (block, index) => ({
      id: String(index),
      title: block.title,
      startTime: block.startTime,
      endTime: block.endTime,
    }),
  );

  const existingCount = occurrences.filter((occurrence) =>
    isDuplicateBlock(occurrence, existingBlocks),
  ).length;

  return {
    expectedCount,
    existingCount,
    missingCount: expectedCount - existingCount,
  };
}

export function formatRoutineGeneratedStatus(
  status: Pick<RoutineGeneratedStatus, "expectedCount" | "existingCount">,
  labels: RoutineGeneratedStatusLabels,
  formatPartial: (existing: string, expected: string) => string,
): string {
  if (status.expectedCount === 0) {
    return labels.noDates;
  }
  if (status.existingCount === status.expectedCount) {
    return labels.all;
  }
  if (status.existingCount === 0) {
    return labels.none;
  }
  return formatPartial(
    String(status.existingCount),
    String(status.expectedCount),
  );
}
