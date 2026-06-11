import { describe, expect, it } from "vitest";

import { buildRoutineOccurrence } from "@/lib/routines/routine-generate";
import { listItemToRoutineForGenerate } from "@/lib/routines/routine-generate";
import { estimateRoutineGeneratedStatus } from "@/lib/routines/routine-generated-status";
import type { RoutineGenerateListItem } from "@/lib/routines/routine-types";

const TIME_ZONE = "Asia/Shanghai";

function makeRoutine(
  overrides: Partial<RoutineGenerateListItem> = {},
): RoutineGenerateListItem {
  return {
    id: "routine-1",
    title: "上班",
    categoryId: "cat-1",
    categoryName: "工作",
    startTime: "09:00",
    endTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    startDate: "2026-06-01",
    endDate: null,
    isActive: true,
    ...overrides,
  };
}

describe("estimateRoutineGeneratedStatus", () => {
  it("counts expected occurrences in the next 7 days", () => {
    const status = estimateRoutineGeneratedStatus({
      routine: makeRoutine(),
      existingBlocks: [],
      startDate: "2026-06-10",
      endDate: "2026-06-16",
      timeZone: TIME_ZONE,
    });

    expect(status.expectedCount).toBe(5);
    expect(status.existingCount).toBe(0);
    expect(status.missingCount).toBe(5);
  });

  it("counts existing blocks with matching title and times", () => {
    const routine = makeRoutine();
    const routineForGenerate = listItemToRoutineForGenerate(routine);
    const occurrence = buildRoutineOccurrence(
      routineForGenerate,
      "2026-06-11",
      TIME_ZONE,
    );
    expect(occurrence).not.toBeNull();

    const status = estimateRoutineGeneratedStatus({
      routine,
      existingBlocks: [
        {
          title: "上班",
          startTime: occurrence!.startTime,
          endTime: occurrence!.endTime,
        },
      ],
      startDate: "2026-06-10",
      endDate: "2026-06-16",
      timeZone: TIME_ZONE,
    });

    expect(status.expectedCount).toBe(5);
    expect(status.existingCount).toBe(1);
    expect(status.missingCount).toBe(4);
  });

  it("returns zero expected when routine has no matching weekdays in range", () => {
    const status = estimateRoutineGeneratedStatus({
      routine: makeRoutine({ daysOfWeek: [0, 6] }),
      existingBlocks: [],
      startDate: "2026-06-10",
      endDate: "2026-06-12",
      timeZone: TIME_ZONE,
    });

    expect(status.expectedCount).toBe(0);
    expect(status.existingCount).toBe(0);
    expect(status.missingCount).toBe(0);
  });

  it("reports partial generation", () => {
    const routine = makeRoutine();
    const routineForGenerate = listItemToRoutineForGenerate(routine);
    const blocks = ["2026-06-11", "2026-06-12"]
      .map((date) => buildRoutineOccurrence(routineForGenerate, date, TIME_ZONE))
      .filter((occurrence) => occurrence !== null)
      .map((occurrence) => ({
        title: occurrence!.title,
        startTime: occurrence!.startTime,
        endTime: occurrence!.endTime,
      }));

    const status = estimateRoutineGeneratedStatus({
      routine,
      existingBlocks: blocks,
      startDate: "2026-06-10",
      endDate: "2026-06-16",
      timeZone: TIME_ZONE,
    });

    expect(status.expectedCount).toBe(5);
    expect(status.existingCount).toBe(2);
    expect(status.missingCount).toBe(3);
  });
});
