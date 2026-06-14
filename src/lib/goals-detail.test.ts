import { describe, expect, it } from "vitest";
import {
  buildGoalDetailProgress,
  buildGoalHistoryBars,
  buildGoalDetailHref,
  buildGoalsListHref,
  computeRemainingMinutes,
  deriveGoalOverallStatus,
  formatAchievementRatePercent,
  orderGoalPeriodsForHistory,
  parseGoalDetailFromFilter,
  selectPeriodsForHistoryChart,
} from "./goals-detail";
import type { GoalPeriodLike } from "./goals";

function period(
  start: string,
  status: string,
  actual = 60,
  target = 120,
): GoalPeriodLike {
  const periodStart = new Date(start);
  const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
  return {
    periodStart,
    periodEnd,
    actualMinutes: actual,
    targetMinutes: target,
    status,
  };
}

describe("deriveGoalOverallStatus", () => {
  it("returns inactive when goal is not active", () => {
    expect(
      deriveGoalOverallStatus({ isActive: false }, period("2026-06-10T00:00:00Z", "active")),
    ).toBe("inactive");
  });

  it("returns achieved or missed from display period", () => {
    expect(
      deriveGoalOverallStatus({ isActive: true }, period("2026-06-10T00:00:00Z", "achieved")),
    ).toBe("achieved");
    expect(
      deriveGoalOverallStatus({ isActive: true }, period("2026-06-10T00:00:00Z", "missed")),
    ).toBe("missed");
  });
});

describe("orderGoalPeriodsForHistory", () => {
  it("orders newest first", () => {
    const ordered = orderGoalPeriodsForHistory([
      period("2026-06-08T00:00:00Z", "achieved"),
      period("2026-06-10T00:00:00Z", "active"),
      period("2026-06-09T00:00:00Z", "missed"),
    ]);
    expect(ordered[0].periodStart.toISOString()).toBe("2026-06-10T00:00:00.000Z");
    expect(ordered[2].periodStart.toISOString()).toBe("2026-06-08T00:00:00.000Z");
  });
});

describe("selectPeriodsForHistoryChart", () => {
  it("limits daily periods to 14", () => {
    const periods = Array.from({ length: 20 }, (_, i) =>
      period(`2026-06-${String(i + 1).padStart(2, "0")}T00:00:00Z`, "achieved"),
    );
    expect(selectPeriodsForHistoryChart(periods, "daily")).toHaveLength(14);
  });

  it("returns empty for one-time goals", () => {
    expect(selectPeriodsForHistoryChart([period("2026-06-01T00:00:00Z", "achieved")], "once")).toEqual([]);
  });
});

describe("computeRemainingMinutes", () => {
  it("returns remaining only for active periods", () => {
    expect(computeRemainingMinutes(30, 120, "active")).toBe(90);
    expect(computeRemainingMinutes(150, 120, "active")).toBe(0);
    expect(computeRemainingMinutes(30, 120, "achieved")).toBeNull();
  });
});

describe("formatAchievementRatePercent", () => {
  it("rounds rate to whole percent", () => {
    expect(formatAchievementRatePercent(0.666)).toBe(67);
    expect(formatAchievementRatePercent(0)).toBe(0);
  });
});

describe("buildGoalDetailProgress", () => {
  it("uses display period for progress data", () => {
    const detail = buildGoalDetailProgress(
      { metric: "time_block_minutes", targetMinutes: 120, period: "daily" },
      period("2026-06-10T00:00:00Z", "active", 45, 120),
      "en",
      "UTC",
    );
    expect(detail.actualMinutes).toBe(45);
    expect(detail.targetMinutes).toBe(120);
    expect(detail.progressPercent).toBe(38);
    expect(detail.remainingMinutes).toBe(75);
  });
});

describe("buildGoalHistoryBars", () => {
  it("builds bar data with progress percent", () => {
    const bars = buildGoalHistoryBars(
      [period("2026-06-10T00:00:00Z", "achieved", 60, 120)],
      "daily",
      "time_block_minutes",
      "en",
      "UTC",
    );
    expect(bars).toHaveLength(1);
    expect(bars[0].progressPercent).toBe(50);
    expect(bars[0].progressLabel).toContain("/");
  });

  it("uses count labels for count metrics", () => {
    const bars = buildGoalHistoryBars(
      [period("2026-06-10T00:00:00Z", "achieved", 3, 5)],
      "daily",
      "completed_blocks_count",
      "en",
      "UTC",
    );
    expect(bars[0].progressLabel).toBe("3 / 5");
  });
});

describe("navigation helpers", () => {
  it("preserves filter in detail and back links", () => {
    expect(buildGoalDetailHref("g1", "missed")).toBe("/goals/g1?fromFilter=missed");
    expect(buildGoalsListHref("missed")).toBe("/goals?filter=missed");
    expect(buildGoalsListHref("active")).toBe("/goals");
  });

  it("parses fromFilter param", () => {
    expect(parseGoalDetailFromFilter("history")).toBe("history");
    expect(parseGoalDetailFromFilter(undefined)).toBe("active");
  });
});
