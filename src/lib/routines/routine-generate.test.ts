import { describe, expect, it } from "vitest";

import {
  expandRoutineOccurrences,
  estimateRoutineOccurrenceCount,
  intervalsOverlap,
  isDuplicateBlock,
  processRoutineCandidate,
  routineAppliesOnDate,
  toInterval,
} from "@/lib/routines/routine-generate";
import type { RoutineGenerateListItem } from "@/lib/routines/routine-types";
import {
  countInclusiveDays,
  validateGenerateDateRange,
} from "@/lib/routines/routine-generate-range";
import type { RoutineForGenerate } from "@/lib/routines/routine-generate-types";

const TIME_ZONE = "Asia/Shanghai";

function makeRoutine(
  overrides: Partial<RoutineForGenerate> = {},
): RoutineForGenerate {
  return {
    id: "routine-1",
    title: "上班",
    categoryId: "cat-1",
    startTime: "09:00",
    endTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    startDate: new Date("2026-06-01T00:00:00"),
    endDate: null,
    notes: null,
    isActive: true,
    ...overrides,
  };
}

describe("validateGenerateDateRange", () => {
  it("rejects startDate after endDate", () => {
    expect(validateGenerateDateRange("2026-06-10", "2026-06-01")).toBe(
      "invalid_range",
    );
  });

  it("rejects ranges longer than 31 days", () => {
    expect(validateGenerateDateRange("2026-06-01", "2026-07-05")).toBe(
      "range_too_long",
    );
  });

  it("accepts valid ranges", () => {
    expect(validateGenerateDateRange("2026-06-01", "2026-06-07")).toBeNull();
    expect(countInclusiveDays("2026-06-01", "2026-06-07")).toBe(7);
  });
});

describe("expandRoutineOccurrences", () => {
  it("expands weekdays within range", () => {
    const occurrences = expandRoutineOccurrences({
      routines: [makeRoutine()],
      startDate: "2026-06-08",
      endDate: "2026-06-14",
      timeZone: TIME_ZONE,
    });

    expect(occurrences).toHaveLength(5);
    expect(occurrences.map((item) => item.date)).toEqual([
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ]);
  });

  it("respects routine startDate and endDate", () => {
    const occurrences = expandRoutineOccurrences({
      routines: [
        makeRoutine({
          startDate: new Date("2026-06-10T00:00:00"),
          endDate: new Date("2026-06-11T00:00:00"),
        }),
      ],
      startDate: "2026-06-08",
      endDate: "2026-06-14",
      timeZone: TIME_ZONE,
    });

    expect(occurrences.map((item) => item.date)).toEqual([
      "2026-06-10",
      "2026-06-11",
    ]);
  });

  it("skips inactive routines", () => {
    const occurrences = expandRoutineOccurrences({
      routines: [makeRoutine({ isActive: false })],
      startDate: "2026-06-08",
      endDate: "2026-06-14",
      timeZone: TIME_ZONE,
    });

    expect(occurrences).toHaveLength(0);
  });
});

describe("routineAppliesOnDate", () => {
  it("checks routine effective dates", () => {
    const routine = makeRoutine({
      startDate: new Date("2026-06-10T00:00:00"),
      endDate: new Date("2026-06-12T00:00:00"),
    });

    expect(routineAppliesOnDate(routine, "2026-06-09", TIME_ZONE)).toBe(false);
    expect(routineAppliesOnDate(routine, "2026-06-10", TIME_ZONE)).toBe(true);
    expect(routineAppliesOnDate(routine, "2026-06-13", TIME_ZONE)).toBe(false);
  });
});

describe("processRoutineCandidate", () => {
  const baseCandidate = {
    routineId: "routine-1",
    title: "上班",
    categoryId: "cat-1",
    date: "2026-06-10",
    startTime: new Date("2026-06-10T01:00:00.000Z"),
    endTime: new Date("2026-06-10T09:00:00.000Z"),
    note: null,
  };

  it("skips duplicate blocks", () => {
    const result = processRoutineCandidate({
      candidate: baseCandidate,
      categoryIds: new Set(["cat-1"]),
      existingBlocks: [
        {
          id: "block-1",
          title: "上班",
          startTime: baseCandidate.startTime,
          endTime: baseCandidate.endTime,
        },
      ],
      existingIntervals: [
        toInterval(baseCandidate.startTime, baseCandidate.endTime)!,
      ],
      batchIntervals: [],
    });

    expect(result.action).toBe("skip");
    if (result.action === "skip") {
      expect(result.skipped.reason).toBe("duplicate");
    }
  });

  it("skips conflicts with existing blocks", () => {
    const overlappingStart = new Date(baseCandidate.startTime.getTime() + 30 * 60_000);
    const overlappingEnd = new Date(baseCandidate.endTime.getTime() + 30 * 60_000);

    const result = processRoutineCandidate({
      candidate: baseCandidate,
      categoryIds: new Set(["cat-1"]),
      existingBlocks: [
        {
          id: "block-1",
          title: "会议",
          startTime: overlappingStart,
          endTime: overlappingEnd,
        },
      ],
      existingIntervals: [toInterval(overlappingStart, overlappingEnd)!],
      batchIntervals: [],
    });

    expect(result.action).toBe("skip");
    if (result.action === "skip") {
      expect(result.skipped.reason).toBe("conflict_existing");
    }
  });

  it("skips later batch conflicts", () => {
    const first = baseCandidate;
    const second = {
      ...baseCandidate,
      routineId: "routine-2",
      title: "背单词",
      startTime: new Date(baseCandidate.startTime.getTime() + 30 * 60_000),
      endTime: new Date(baseCandidate.endTime.getTime() + 30 * 60_000),
    };

    const firstInterval = toInterval(first.startTime, first.endTime)!;
    const batchIntervals = [firstInterval];

    const result = processRoutineCandidate({
      candidate: second,
      categoryIds: new Set(["cat-1"]),
      existingBlocks: [],
      existingIntervals: [],
      batchIntervals,
    });

    expect(result.action).toBe("skip");
    if (result.action === "skip") {
      expect(result.skipped.reason).toBe("conflict_batch");
    }
  });

  it("creates valid candidates", () => {
    const result = processRoutineCandidate({
      candidate: baseCandidate,
      categoryIds: new Set(["cat-1"]),
      existingBlocks: [],
      existingIntervals: [],
      batchIntervals: [],
    });

    expect(result.action).toBe("create");
  });
});

describe("intervalsOverlap", () => {
  it("treats touching endpoints as non-overlapping", () => {
    const a = toInterval(
      new Date("2026-06-10T01:00:00.000Z"),
      new Date("2026-06-10T02:00:00.000Z"),
    )!;
    const b = toInterval(
      new Date("2026-06-10T02:00:00.000Z"),
      new Date("2026-06-10T03:00:00.000Z"),
    )!;
    expect(intervalsOverlap(a, b)).toBe(false);
  });

  it("detects partial overlaps", () => {
    const a = toInterval(
      new Date("2026-06-10T01:00:00.000Z"),
      new Date("2026-06-10T03:00:00.000Z"),
    )!;
    const b = toInterval(
      new Date("2026-06-10T02:00:00.000Z"),
      new Date("2026-06-10T04:00:00.000Z"),
    )!;
    expect(intervalsOverlap(a, b)).toBe(true);
  });
});

describe("isDuplicateBlock", () => {
  it("matches title and exact times", () => {
    const candidate = {
      routineId: "routine-1",
      title: "上班",
      categoryId: "cat-1",
      date: "2026-06-10",
      startTime: new Date("2026-06-10T01:00:00.000Z"),
      endTime: new Date("2026-06-10T09:00:00.000Z"),
      note: null,
    };

    expect(
      isDuplicateBlock(candidate, [
        {
          id: "block-1",
          title: "上班",
          startTime: candidate.startTime,
          endTime: candidate.endTime,
        },
      ]),
    ).toBe(true);
  });
});

function makeListItem(
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

describe("estimateRoutineOccurrenceCount", () => {
  it("counts occurrences for selected routines", () => {
    const count = estimateRoutineOccurrenceCount({
      routines: [
        makeListItem(),
        makeListItem({
          id: "routine-2",
          title: "背单词",
          startTime: "07:00",
          endTime: "08:00",
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        }),
      ],
      selectedRoutineIds: ["routine-2"],
      startDate: "2026-06-08",
      endDate: "2026-06-14",
      timeZone: TIME_ZONE,
    });

    expect(count).toBe(7);
  });

  it("excludes inactive and missing-category routines", () => {
    expect(
      estimateRoutineOccurrenceCount({
        routines: [
          makeListItem({ isActive: false }),
          makeListItem({ id: "routine-2", categoryId: null }),
        ],
        selectedRoutineIds: ["routine-1", "routine-2"],
        startDate: "2026-06-08",
        endDate: "2026-06-14",
        timeZone: TIME_ZONE,
      }),
    ).toBe(0);
  });

  it("returns zero when range has no matches", () => {
    expect(
      estimateRoutineOccurrenceCount({
        routines: [makeListItem({ endDate: "2026-06-01" })],
        selectedRoutineIds: ["routine-1"],
        startDate: "2026-06-08",
        endDate: "2026-06-14",
        timeZone: TIME_ZONE,
      }),
    ).toBe(0);
  });
});
