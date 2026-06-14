import { describe, expect, it } from "vitest";
import {
  calculateCompletedBlocksCountInPeriod,
  calculateFocusMinutesInPeriod,
  calculateFocusSessionsCountInPeriod,
  calculateGoalPeriodActual,
  type GoalFocusSegmentLike,
  type GoalFocusSessionLike,
  type GoalTimeBlockLike,
} from "./goals";
import {
  formatGoalProgressPair,
  formatGoalProgressValue,
  goalTargetToFormInput,
  isGoalCountMetric,
} from "./goals-metric-display";

const PERIOD_START = new Date("2026-06-10T00:00:00Z");
const PERIOD_END = new Date("2026-06-11T00:00:00Z");

function block(partial: Partial<GoalTimeBlockLike>): GoalTimeBlockLike {
  return {
    startTime: partial.startTime ?? new Date("2026-06-10T10:00:00Z"),
    endTime: partial.endTime ?? new Date("2026-06-10T11:00:00Z"),
    categoryId: partial.categoryId ?? "cat-a",
    status: partial.status ?? "completed",
    completionLevel: partial.completionLevel ?? null,
  };
}

function session(partial: Partial<GoalFocusSessionLike>): GoalFocusSessionLike {
  return {
    id: partial.id ?? "s1",
    startTime: partial.startTime ?? new Date("2026-06-10T10:00:00Z"),
    endTime: partial.endTime ?? new Date("2026-06-10T11:00:00Z"),
    status: partial.status ?? "completed",
    categoryId: partial.categoryId ?? "cat-a",
    actualDurationMinutes: partial.actualDurationMinutes ?? 60,
    plannedDurationMinutes: partial.plannedDurationMinutes ?? 60,
  };
}

describe("calculateCompletedBlocksCountInPeriod", () => {
  it("counts only completed blocks by startTime in window", () => {
    const count = calculateCompletedBlocksCountInPeriod(
      [
        block({ status: "completed" }),
        block({ status: "partial", startTime: new Date("2026-06-10T12:00:00Z") }),
        block({ status: "planned", startTime: new Date("2026-06-10T13:00:00Z") }),
      ],
      PERIOD_START,
      PERIOD_END,
    );
    expect(count).toBe(1);
  });

  it("filters by categoryId", () => {
    const count = calculateCompletedBlocksCountInPeriod(
      [
        block({ categoryId: "cat-a" }),
        block({ categoryId: "cat-b", startTime: new Date("2026-06-10T11:00:00Z") }),
      ],
      PERIOD_START,
      PERIOD_END,
      "cat-a",
    );
    expect(count).toBe(1);
  });
});

describe("calculateFocusMinutesInPeriod", () => {
  it("excludes abandoned and failed sessions", () => {
    const minutes = calculateFocusMinutesInPeriod(
      [
        session({ status: "completed", actualDurationMinutes: 45 }),
        session({ id: "s2", status: "abandoned", actualDurationMinutes: 30 }),
        session({ id: "s3", status: "failed", actualDurationMinutes: 20 }),
        session({ id: "s4", status: "running", actualDurationMinutes: 10 }),
      ],
      new Map(),
      PERIOD_START,
      PERIOD_END,
    );
    expect(minutes).toBe(45);
  });

  it("includes converted sessions", () => {
    const minutes = calculateFocusMinutesInPeriod(
      [session({ status: "converted", actualDurationMinutes: 25 })],
      new Map(),
      PERIOD_START,
      PERIOD_END,
    );
    expect(minutes).toBe(25);
  });

  it("sums segment durationMinutes when segments exist", () => {
    const segments = new Map<string, readonly GoalFocusSegmentLike[]>([
      [
        "s1",
        [
          {
            focusSessionId: "s1",
            startTime: new Date("2026-06-10T10:00:00Z"),
            durationMinutes: 20,
            categoryId: "cat-a",
          },
          {
            focusSessionId: "s1",
            startTime: new Date("2026-06-10T11:00:00Z"),
            durationMinutes: 15,
            categoryId: "cat-a",
          },
        ],
      ],
    ]);
    const minutes = calculateFocusMinutesInPeriod(
      [session({ id: "s1", status: "completed", actualDurationMinutes: 999 })],
      segments,
      PERIOD_START,
      PERIOD_END,
    );
    expect(minutes).toBe(35);
  });

  it("filters focus segments by categoryId", () => {
    const segments = new Map<string, readonly GoalFocusSegmentLike[]>([
      [
        "s1",
        [
          {
            focusSessionId: "s1",
            startTime: new Date("2026-06-10T10:00:00Z"),
            durationMinutes: 20,
            categoryId: "cat-a",
          },
          {
            focusSessionId: "s1",
            startTime: new Date("2026-06-10T11:00:00Z"),
            durationMinutes: 10,
            categoryId: "cat-b",
          },
        ],
      ],
    ]);
    const minutes = calculateFocusMinutesInPeriod(
      [session({ id: "s1", status: "completed" })],
      segments,
      PERIOD_START,
      PERIOD_END,
      "cat-a",
    );
    expect(minutes).toBe(20);
  });

  it("does not count segments when parent session is failed", () => {
    const segments = new Map<string, readonly GoalFocusSegmentLike[]>([
      [
        "s1",
        [
          {
            focusSessionId: "s1",
            startTime: new Date("2026-06-10T10:00:00Z"),
            durationMinutes: 50,
            categoryId: "cat-a",
          },
        ],
      ],
    ]);
    const minutes = calculateFocusMinutesInPeriod(
      [session({ id: "s1", status: "failed" })],
      segments,
      PERIOD_START,
      PERIOD_END,
    );
    expect(minutes).toBe(0);
  });
});

describe("calculateFocusSessionsCountInPeriod", () => {
  it("counts completed and converted only", () => {
    const count = calculateFocusSessionsCountInPeriod(
      [
        session({ status: "completed" }),
        session({ id: "s2", status: "converted" }),
        session({ id: "s3", status: "abandoned" }),
        session({ id: "s4", status: "failed" }),
      ],
      PERIOD_START,
      PERIOD_END,
    );
    expect(count).toBe(2);
  });

  it("filters by categoryId", () => {
    const count = calculateFocusSessionsCountInPeriod(
      [
        session({ categoryId: "cat-a" }),
        session({ id: "s2", categoryId: "cat-b", startTime: new Date("2026-06-10T11:00:00Z") }),
      ],
      PERIOD_START,
      PERIOD_END,
      "cat-a",
    );
    expect(count).toBe(1);
  });
});

describe("calculateGoalPeriodActual time_block_minutes regression", () => {
  it("delegates to existing minute logic unchanged", () => {
    const actual = calculateGoalPeriodActual("time_block_minutes", {
      blocks: [block({ status: "completed" })],
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    });
    expect(actual).toBe(60);
  });
});

describe("display helpers", () => {
  it("formats count metrics as integers without duration text", () => {
    expect(formatGoalProgressValue("completed_blocks_count", 5, "en")).toBe("5");
    expect(formatGoalProgressValue("focus_sessions_count", 90, "en")).toBe("90");
    expect(formatGoalProgressValue("focus_sessions_count", 90, "en")).not.toMatch(
      /min|小时|h /i,
    );
    expect(isGoalCountMetric("focus_sessions_count")).toBe(true);
  });

  it("formats minute metrics as duration", () => {
    expect(formatGoalProgressValue("time_block_minutes", 90, "en")).toContain("1");
  });

  it("builds progress pair templates", () => {
    const pair = formatGoalProgressPair("completed_blocks_count", 3, 5, "en", {
      progressOf: "{actual} / {target}",
      progressCount: "{actual} / {target}",
      remaining: "{minutes} left",
      remainingCount: "{count} left",
    });
    expect(pair).toBe("3 / 5");
  });

  it("maps form input by metric", () => {
    expect(goalTargetToFormInput("time_block_minutes", 120)).toBe("2");
    expect(goalTargetToFormInput("completed_blocks_count", 5)).toBe("5");
  });
});

describe("isFrozenGoalPeriodStatus unchanged", () => {
  it("still freezes achieved and missed", async () => {
    const { isFrozenGoalPeriodStatus } = await import("./goals");
    expect(isFrozenGoalPeriodStatus("achieved")).toBe(true);
    expect(isFrozenGoalPeriodStatus("missed")).toBe(true);
    expect(isFrozenGoalPeriodStatus("active")).toBe(false);
  });
});

describe("goalMetricDisplay helpers", () => {
  it("formats history progress for detail and list", async () => {
    const { formatGoalHistoryProgressLabel } = await import("./goals-detail");
    expect(
      formatGoalHistoryProgressLabel("completed_blocks_count", 2, 5, "en"),
    ).toBe("2 / 5");
    expect(formatGoalHistoryProgressLabel("focus_minutes", 90, 120, "en")).toContain("/");
  });
});

describe("metric read-only contract", () => {
  it("accepts only known metrics on create validation", async () => {
    const { validateGoalInput } = await import("./goals");
    const startDate = new Date("2026-06-01T00:00:00Z");
    expect(
      validateGoalInput({
        title: "Test",
        targetMinutes: 5,
        metric: "invalid_metric",
        goalType: "recurring",
        period: "daily",
        startDate,
        endDate: null,
      }),
    ).toBe("invalid_metric");
    expect(
      validateGoalInput({
        title: "Test",
        targetMinutes: 5,
        metric: "focus_sessions_count",
        goalType: "recurring",
        period: "daily",
        startDate,
        endDate: null,
      }),
    ).toBeNull();
  });

  it("rejects non-integer targets for count metrics on update", async () => {
    const { validateGoalUpdateInput } = await import("./goals");
    const startDate = new Date("2026-06-01T00:00:00Z");
    expect(
      validateGoalUpdateInput({
        title: "Blocks",
        targetMinutes: 2.5,
        metric: "completed_blocks_count",
        goalType: "recurring",
        period: "daily",
        startDate,
        endDate: null,
      }),
    ).toBe("invalid_target_minutes");
  });
});
