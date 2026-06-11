import { describe, expect, it } from "vitest";

import { getBusyIntervalsFromContext } from "@/lib/assistant/tomorrow-plan-busy";
import { buildTomorrowRoutineBlocks } from "@/lib/assistant/tomorrow-plan-routines";
import { generateMockTomorrowPlan } from "@/lib/assistant/tomorrow-plan-mock";
import { validateTomorrowPlanResult } from "@/lib/assistant/tomorrow-plan-schema";
import type { TomorrowPlanContext } from "@/lib/assistant/tomorrow-plan-types";

const TIME_ZONE = "Asia/Shanghai";

function makeRoutine(
  overrides: Partial<{
    id: string;
    title: string;
    categoryId: string | null;
    category: { name: string } | null;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
  }> = {},
) {
  return {
    id: "routine-1",
    title: "上班",
    categoryId: "cat-1",
    category: { name: "工作" },
    startTime: "09:00",
    endTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    startDate: new Date("2026-06-01T00:00:00"),
    endDate: null,
    isActive: true,
    ...overrides,
  };
}

describe("buildTomorrowRoutineBlocks", () => {
  it("includes active routines matching tomorrow weekday", () => {
    const blocks = buildTomorrowRoutineBlocks({
      date: "2026-06-11",
      timeZone: TIME_ZONE,
      routines: [
        makeRoutine(),
        makeRoutine({
          id: "routine-2",
          title: "背单词",
          startTime: "07:00",
          endTime: "08:00",
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        }),
      ],
    });

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.title).toBe("背单词");
    expect(blocks[1]?.title).toBe("上班");
    expect(blocks[0]?.startTime < blocks[1]?.startTime).toBe(true);
  });

  it("excludes inactive routines", () => {
    expect(
      buildTomorrowRoutineBlocks({
        date: "2026-06-11",
        timeZone: TIME_ZONE,
        routines: [makeRoutine({ isActive: false })],
      }),
    ).toHaveLength(0);
  });

  it("excludes routines outside effective date range", () => {
    expect(
      buildTomorrowRoutineBlocks({
        date: "2026-06-11",
        timeZone: TIME_ZONE,
        routines: [
          makeRoutine({ startDate: new Date("2026-06-12T00:00:00") }),
          makeRoutine({ endDate: new Date("2026-06-10T00:00:00") }),
        ],
      }),
    ).toHaveLength(0);
  });

  it("excludes routines not scheduled on target weekday", () => {
    expect(
      buildTomorrowRoutineBlocks({
        date: "2026-06-11",
        timeZone: TIME_ZONE,
        routines: [makeRoutine({ daysOfWeek: [0, 6] })],
      }),
    ).toHaveLength(0);
  });

  it("allows routines without category", () => {
    const blocks = buildTomorrowRoutineBlocks({
      date: "2026-06-11",
      timeZone: TIME_ZONE,
      routines: [makeRoutine({ categoryId: null, category: null, title: "无分类安排" })],
    });

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.categoryId).toBeNull();
    expect(blocks[0]?.categoryName).toBeNull();
  });
});

describe("getBusyIntervalsFromContext", () => {
  it("merges existing blocks and routine blocks", () => {
    const busy = getBusyIntervalsFromContext({
      existingBlocks: [
        {
          id: "tb-1",
          title: "会议",
          categoryId: "cat-1",
          categoryName: "工作",
          startTime: "2026-06-11T02:00:00.000Z",
          endTime: "2026-06-11T03:00:00.000Z",
        },
      ],
      routineBlocks: [
        {
          routineId: "r-1",
          title: "上班",
          categoryId: "cat-1",
          categoryName: "工作",
          startTime: "2026-06-11T01:00:00.000Z",
          endTime: "2026-06-11T09:00:00.000Z",
          daysOfWeek: [1, 2, 3, 4, 5],
        },
      ],
    });

    expect(busy).toHaveLength(2);
    expect(busy.some((item) => item.source === "timeBlock")).toBe(true);
    expect(busy.some((item) => item.source === "routine")).toBe(true);
  });
});

function baseContext(
  overrides: Partial<TomorrowPlanContext> = {},
): TomorrowPlanContext {
  return {
    date: "2026-06-11",
    timezone: TIME_ZONE,
    existingBlocks: [],
    routineBlocks: [],
    categories: [{ id: "cat-1", name: "学习" }],
    recentCategoryUsage: [],
    ...overrides,
  };
}

describe("validateTomorrowPlanResult", () => {
  it("filters suggested blocks conflicting with routineBlocks", () => {
    const context = baseContext({
      routineBlocks: [
        {
          routineId: "r-1",
          title: "上班",
          categoryId: "cat-1",
          categoryName: "工作",
          startTime: "2026-06-11T01:00:00.000Z",
          endTime: "2026-06-11T09:00:00.000Z",
          daysOfWeek: [1, 2, 3, 4, 5],
        },
      ],
    });

    const result = validateTomorrowPlanResult(
      {
        summary: "测试计划",
        assumptions: [],
        suggestedBlocks: [
          {
            title: "冲突任务",
            categoryId: "cat-1",
            startTime: "2026-06-11T02:00:00.000Z",
            endTime: "2026-06-11T03:00:00.000Z",
            reason: "测试",
            confidence: "medium",
          },
          {
            title: "晚间任务",
            categoryId: "cat-1",
            startTime: "2026-06-11T11:00:00.000Z",
            endTime: "2026-06-11T12:30:00.000Z",
            reason: "测试",
            confidence: "medium",
          },
        ],
        warnings: [],
      },
      context,
      "zh",
    );

    expect(result.suggestedBlocks).toHaveLength(1);
    expect(result.suggestedBlocks[0]?.title).toBe("晚间任务");
    expect(result.warnings.some((warning) => warning.includes("固定安排"))).toBe(
      true,
    );
  });
});

describe("generateMockTomorrowPlan", () => {
  it("avoids routineBlocks when finding free slots", () => {
    const routineBlocks = buildTomorrowRoutineBlocks({
      date: "2026-06-11",
      timeZone: TIME_ZONE,
      routines: [
        makeRoutine({
          startTime: "09:00",
          endTime: "17:00",
        }),
      ],
    });

    const plan = generateMockTomorrowPlan({
      userGoal: "明天想复习雅思阅读和写作",
      context: baseContext({ routineBlocks }),
      locale: "zh",
    });

    for (const block of plan.suggestedBlocks) {
      const startMs = new Date(block.startTime).getTime();
      const endMs = new Date(block.endTime).getTime();
      for (const routine of routineBlocks) {
        const routineStart = new Date(routine.startTime).getTime();
        const routineEnd = new Date(routine.endTime).getTime();
        const overlaps = startMs < routineEnd && routineStart < endMs;
        expect(overlaps).toBe(false);
      }
    }
  });
});
