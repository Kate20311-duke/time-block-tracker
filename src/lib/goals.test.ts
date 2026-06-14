import { describe, expect, it } from "vitest";
import {
  buildGoalPeriodRanges,
  calculateActualMinutesInPeriod,
  calculateCurrentStreak,
  calculateLongestStreak,
  effectiveProgressWindowEnd,
  evaluateGoalPeriodStatus,
  filterNewGoalPeriodRanges,
  getDisplayGoalPeriod,
  goalPeriodIdentityKey,
  isFrozenGoalPeriodStatus,
  matchesGoalListFilter,
  parseGoalDateParamInTimeZone,
  parseGoalListFilter,
  validateGoalUpdateInput,
  type GoalTimeBlockLike,
} from "./goals";

const TZ = "UTC";
const NY = "America/New_York";

function block(partial: Partial<GoalTimeBlockLike>): GoalTimeBlockLike {
  return {
    startTime: partial.startTime ?? new Date("2026-06-10T10:00:00Z"),
    endTime: partial.endTime ?? new Date("2026-06-10T11:00:00Z"),
    categoryId: partial.categoryId ?? "cat-work",
    status: partial.status ?? "completed",
    completionLevel: partial.completionLevel ?? null,
  };
}

describe("evaluateGoalPeriodStatus", () => {
  const periodEnd = new Date("2026-06-15T00:00:00Z");

  it("returns active before period end", () => {
    expect(
      evaluateGoalPeriodStatus(
        periodEnd,
        new Date("2026-06-14T12:00:00Z"),
        10,
        60,
      ),
    ).toBe("active");
  });

  it("returns achieved when target met at period end", () => {
    expect(
      evaluateGoalPeriodStatus(periodEnd, new Date("2026-06-15T00:00:00Z"), 60, 60),
    ).toBe("achieved");
  });

  it("returns missed when target not met at period end", () => {
    expect(
      evaluateGoalPeriodStatus(periodEnd, new Date("2026-06-15T00:00:00Z"), 30, 60),
    ).toBe("missed");
  });

  it("evaluates achieved exactly at period end boundary", () => {
    expect(
      evaluateGoalPeriodStatus(periodEnd, periodEnd, 60, 60),
    ).toBe("achieved");
    expect(
      evaluateGoalPeriodStatus(periodEnd, periodEnd, 59, 60),
    ).toBe("missed");
  });
});

describe("buildGoalPeriodRanges", () => {
  it("builds a single once period for one-time goals", () => {
    const ranges = buildGoalPeriodRanges(
      {
        goalType: "one_time",
        period: "once",
        startDate: new Date("2026-06-10T00:00:00Z"),
        endDate: new Date("2026-06-16T23:59:59Z"),
        targetMinutes: 1200,
      },
      new Date("2026-06-12T00:00:00Z"),
      TZ,
    );
    expect(ranges).toHaveLength(1);
    expect(ranges[0].targetMinutes).toBe(1200);
    expect(ranges[0].periodStart.toISOString()).toBe("2026-06-10T00:00:00.000Z");
    expect(ranges[0].periodEnd.toISOString()).toBe("2026-06-17T00:00:00.000Z");
  });

  it("generates daily periods from start through today", () => {
    const ranges = buildGoalPeriodRanges(
      {
        goalType: "recurring",
        period: "daily",
        startDate: new Date("2026-06-10T00:00:00Z"),
        endDate: null,
        targetMinutes: 120,
      },
      new Date("2026-06-12T15:00:00Z"),
      TZ,
    );
    expect(ranges).toHaveLength(3);
    expect(ranges.map((r) => r.periodStart.toISOString())).toEqual([
      "2026-06-10T00:00:00.000Z",
      "2026-06-11T00:00:00.000Z",
      "2026-06-12T00:00:00.000Z",
    ]);
  });

  it("generates weekly periods with Monday start", () => {
    const ranges = buildGoalPeriodRanges(
      {
        goalType: "recurring",
        period: "weekly",
        startDate: new Date("2026-06-11T00:00:00Z"),
        endDate: null,
        targetMinutes: 1800,
      },
      new Date("2026-06-18T12:00:00Z"),
      TZ,
    );
    expect(ranges).toHaveLength(2);
    expect(ranges[0].periodStart.toISOString()).toBe("2026-06-08T00:00:00.000Z");
    expect(ranges[0].periodEnd.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(ranges[1].periodStart.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(ranges[1].periodEnd.toISOString()).toBe("2026-06-22T00:00:00.000Z");
  });

  it("does not generate periods beyond an inactive-style end date", () => {
    const ranges = buildGoalPeriodRanges(
      {
        goalType: "recurring",
        period: "daily",
        startDate: new Date("2026-06-10T00:00:00Z"),
        endDate: new Date("2026-06-11T00:00:00Z"),
        targetMinutes: 60,
      },
      new Date("2026-06-20T00:00:00Z"),
      TZ,
    );
    expect(ranges).toHaveLength(2);
  });
});

describe("filterNewGoalPeriodRanges", () => {
  it("is idempotent when existing keys already cover ranges", () => {
    const ranges = [
      {
        goalId: "g1",
        periodStart: new Date("2026-06-10T00:00:00Z"),
        periodEnd: new Date("2026-06-11T00:00:00Z"),
        targetMinutes: 60,
      },
      {
        goalId: "g1",
        periodStart: new Date("2026-06-11T00:00:00Z"),
        periodEnd: new Date("2026-06-12T00:00:00Z"),
        targetMinutes: 60,
      },
    ];
    const existing = new Set([
      goalPeriodIdentityKey("g1", ranges[0].periodStart),
      goalPeriodIdentityKey("g1", ranges[1].periodStart),
    ]);
    expect(filterNewGoalPeriodRanges(existing, ranges)).toHaveLength(0);

    const partialExisting = new Set([goalPeriodIdentityKey("g1", ranges[0].periodStart)]);
    expect(filterNewGoalPeriodRanges(partialExisting, ranges)).toHaveLength(1);
  });
});

describe("parseGoalDateParamInTimeZone", () => {
  it("parses civil date in user timezone, not server local", () => {
    const day = parseGoalDateParamInTimeZone("2026-06-10", NY);
    expect(day?.toISOString()).toBe("2026-06-10T04:00:00.000Z");
  });
});

describe("calculateActualMinutesInPeriod", () => {
  const periodStart = new Date("2026-06-10T00:00:00Z");
  const periodEnd = new Date("2026-06-11T00:00:00Z");

  it("clips block duration to the period window", () => {
    const minutes = calculateActualMinutesInPeriod(
      [
        block({
          startTime: new Date("2026-06-09T23:00:00Z"),
          endTime: new Date("2026-06-10T01:00:00Z"),
          status: "completed",
        }),
      ],
      periodStart,
      periodEnd,
    );
    expect(minutes).toBe(60);
  });

  it("does not count planned or skipped blocks", () => {
    const minutes = calculateActualMinutesInPeriod(
      [
        block({ status: "planned" }),
        block({ status: "skipped" }),
      ],
      periodStart,
      periodEnd,
    );
    expect(minutes).toBe(0);
  });

  it("counts completed and partial blocks", () => {
    const minutes = calculateActualMinutesInPeriod(
      [
        block({
          status: "completed",
          startTime: new Date("2026-06-10T08:00:00Z"),
          endTime: new Date("2026-06-10T09:00:00Z"),
        }),
        block({
          status: "partial",
          completionLevel: 50,
          startTime: new Date("2026-06-10T10:00:00Z"),
          endTime: new Date("2026-06-10T12:00:00Z"),
        }),
      ],
      periodStart,
      periodEnd,
    );
    expect(minutes).toBe(60 + 60);
  });

  it("filters by category when categoryId is set", () => {
    const minutes = calculateActualMinutesInPeriod(
      [
        block({ categoryId: "cat-work" }),
        block({
          categoryId: "cat-study",
          startTime: new Date("2026-06-10T12:00:00Z"),
          endTime: new Date("2026-06-10T13:00:00Z"),
        }),
      ],
      periodStart,
      periodEnd,
      "cat-work",
    );
    expect(minutes).toBe(60);
  });

  it("counts all blocks when categoryId is null (caller supplies user-scoped blocks)", () => {
    const minutes = calculateActualMinutesInPeriod(
      [
        block({ categoryId: "cat-work" }),
        block({
          categoryId: "cat-study",
          startTime: new Date("2026-06-10T12:00:00Z"),
          endTime: new Date("2026-06-10T13:00:00Z"),
        }),
      ],
      periodStart,
      periodEnd,
      null,
    );
    expect(minutes).toBe(120);
  });

  it("clips active period progress at now, excluding future same-day minutes", () => {
    const now = new Date("2026-06-10T10:00:00Z");
    const minutes = calculateActualMinutesInPeriod(
      [
        block({
          status: "completed",
          startTime: new Date("2026-06-10T08:00:00Z"),
          endTime: new Date("2026-06-10T09:00:00Z"),
        }),
        block({
          status: "completed",
          startTime: new Date("2026-06-10T11:00:00Z"),
          endTime: new Date("2026-06-10T12:00:00Z"),
        }),
      ],
      periodStart,
      periodEnd,
      null,
      now,
    );
    expect(minutes).toBe(60);
  });

  it("counts partial blocks by completionLevel on clipped overlap", () => {
    const minutes = calculateActualMinutesInPeriod(
      [
        block({
          status: "partial",
          completionLevel: 25,
          startTime: new Date("2026-06-10T08:00:00Z"),
          endTime: new Date("2026-06-10T12:00:00Z"),
        }),
      ],
      periodStart,
      periodEnd,
    );
    expect(minutes).toBe(60);
  });

  it("counts cross-midnight overlap only inside the period window", () => {
    const minutes = calculateActualMinutesInPeriod(
      [
        block({
          status: "completed",
          startTime: new Date("2026-06-09T23:30:00Z"),
          endTime: new Date("2026-06-10T00:30:00Z"),
        }),
      ],
      periodStart,
      periodEnd,
    );
    expect(minutes).toBe(30);
  });
});

describe("streak calculations", () => {
  it("current streak skips active period and counts consecutive achieved", () => {
    const streak = calculateCurrentStreak([
      { periodStart: new Date("2026-06-12T00:00:00Z"), status: "active" },
      { periodStart: new Date("2026-06-11T00:00:00Z"), status: "achieved" },
      { periodStart: new Date("2026-06-10T00:00:00Z"), status: "achieved" },
      { periodStart: new Date("2026-06-09T00:00:00Z"), status: "missed" },
    ]);
    expect(streak).toBe(2);
  });

  it("longest streak finds max consecutive achieved periods", () => {
    const longest = calculateLongestStreak([
      { periodStart: new Date("2026-06-07T00:00:00Z"), status: "achieved" },
      { periodStart: new Date("2026-06-08T00:00:00Z"), status: "achieved" },
      { periodStart: new Date("2026-06-09T00:00:00Z"), status: "missed" },
      { periodStart: new Date("2026-06-10T00:00:00Z"), status: "achieved" },
      { periodStart: new Date("2026-06-11T00:00:00Z"), status: "achieved" },
      { periodStart: new Date("2026-06-12T00:00:00Z"), status: "achieved" },
    ]);
    expect(longest).toBe(3);
  });
});

describe("getDisplayGoalPeriod", () => {
  it("uses active period when present", () => {
    const active = {
      periodStart: new Date("2026-06-12T00:00:00Z"),
      periodEnd: new Date("2026-06-13T00:00:00Z"),
      targetMinutes: 60,
      actualMinutes: 10,
      status: "active",
    };
    const ended = {
      periodStart: new Date("2026-06-11T00:00:00Z"),
      periodEnd: new Date("2026-06-12T00:00:00Z"),
      targetMinutes: 60,
      actualMinutes: 60,
      status: "achieved",
    };
    expect(getDisplayGoalPeriod([ended, active])).toEqual(active);
  });

  it("falls back to most recent period for ended one-time goals", () => {
    const ended = {
      periodStart: new Date("2026-06-10T00:00:00Z"),
      periodEnd: new Date("2026-06-17T00:00:00Z"),
      targetMinutes: 120,
      actualMinutes: 90,
      status: "missed",
    };
    expect(getDisplayGoalPeriod([ended])).toEqual(ended);
  });
});

describe("effectiveProgressWindowEnd", () => {
  it("clips at now for active periods", () => {
    const periodEnd = new Date("2026-06-11T00:00:00Z");
    const now = new Date("2026-06-10T10:00:00Z");
    expect(effectiveProgressWindowEnd(periodEnd, now).toISOString()).toBe(
      now.toISOString(),
    );
  });
});

describe("validateGoalUpdateInput", () => {
  const startDate = new Date("2026-06-01T00:00:00Z");

  it("requires title and positive target", () => {
    expect(
      validateGoalUpdateInput({
        title: "",
        targetMinutes: 60,
        metric: "time_block_minutes",
        goalType: "recurring",
        period: "weekly",
        startDate,
        endDate: null,
      }),
    ).toBe("empty_title");
    expect(
      validateGoalUpdateInput({
        title: "Work",
        targetMinutes: 0,
        metric: "time_block_minutes",
        goalType: "recurring",
        period: "weekly",
        startDate,
        endDate: null,
      }),
    ).toBe("invalid_target_minutes");
  });

  it("requires endDate for one-time goals", () => {
    expect(
      validateGoalUpdateInput({
        title: "Deadline",
        targetMinutes: 120,
        metric: "time_block_minutes",
        goalType: "one_time",
        period: "once",
        startDate,
        endDate: null,
      }),
    ).toBe("missing_end_date");
  });

  it("requires endDate after startDate", () => {
    expect(
      validateGoalUpdateInput({
        title: "Deadline",
        targetMinutes: 120,
        metric: "time_block_minutes",
        goalType: "one_time",
        period: "once",
        startDate,
        endDate: new Date("2026-05-01T00:00:00Z"),
      }),
    ).toBe("invalid_date_range");
  });
});

describe("parseGoalListFilter", () => {
  it("defaults to active", () => {
    expect(parseGoalListFilter(undefined)).toBe("active");
    expect(parseGoalListFilter("invalid")).toBe("active");
  });

  it("parses known filters", () => {
    expect(parseGoalListFilter("history")).toBe("history");
    expect(parseGoalListFilter("inactive")).toBe("inactive");
  });
});

describe("matchesGoalListFilter", () => {
  const base = {
    goal: { isActive: true },
    periods: [{ status: "active" }],
  };

  it("filters active goals", () => {
    expect(matchesGoalListFilter(base, "active")).toBe(true);
    expect(
      matchesGoalListFilter({ ...base, goal: { isActive: false } }, "active"),
    ).toBe(false);
  });

  it("filters inactive goals for dashboard exclusion", () => {
    expect(
      matchesGoalListFilter(
        { goal: { isActive: false }, periods: [] },
        "inactive",
      ),
    ).toBe(true);
    expect(
      matchesGoalListFilter(
        { goal: { isActive: true }, periods: [] },
        "inactive",
      ),
    ).toBe(false);
  });

  it("filters history and missed by period status", () => {
    expect(
      matchesGoalListFilter(
        {
          goal: { isActive: true },
          periods: [{ status: "achieved" }, { status: "active" }],
        },
        "history",
      ),
    ).toBe(true);
    expect(
      matchesGoalListFilter(
        {
          goal: { isActive: true },
          periods: [{ status: "missed" }],
        },
        "missed",
      ),
    ).toBe(true);
    expect(
      matchesGoalListFilter(
        {
          goal: { isActive: false },
          periods: [{ status: "missed" }],
        },
        "missed",
      ),
    ).toBe(false);
  });
});

describe("isFrozenGoalPeriodStatus", () => {
  it("freezes achieved and missed periods", () => {
    expect(isFrozenGoalPeriodStatus("achieved")).toBe(true);
    expect(isFrozenGoalPeriodStatus("missed")).toBe(true);
    expect(isFrozenGoalPeriodStatus("active")).toBe(false);
  });
});
