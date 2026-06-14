import { describe, expect, it } from "vitest";

import {
  GoalSuggestionsValidationError,
  finalizeGoalSuggestions,
  validateGoalSuggestionItem,
  validateGoalSuggestionsResult,
} from "./goal-suggestions-schema";
import type { GoalSuggestionsContext } from "./goal-suggestions-types";

const baseContext: GoalSuggestionsContext = {
  timezone: "Asia/Shanghai",
  rangeStart: "2026-06-01",
  rangeEnd: "2026-06-13",
  rangeDays: 14,
  categories: [
    { id: "cat-1", name: "Study" },
    { id: "cat-2", name: "Work" },
  ],
  timeBlocks: {
    totalRecordedMinutes: 600,
    completedBlocksCount: 10,
    avgDailyMinutes: 43,
    avgDailyCompletedBlocks: 0.7,
    categoryBreakdown: [],
  },
  focus: {
    totalMinutes: 120,
    completedSessionCount: 4,
    avgDailyMinutes: 9,
    avgDailySessions: 0.3,
    categoryBreakdown: [],
  },
  activeGoals: [
    {
      title: "Daily study",
      metric: "time_block_minutes",
      period: "daily",
      targetMinutes: 60,
      categoryId: "cat-1",
    },
  ],
  dataScopeNote: "scope",
};

function validSuggestion(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    title: "Daily study",
    description: "Study every day",
    reason: "You study often",
    metric: "focus_minutes",
    goalType: "recurring",
    period: "daily",
    targetValue: 60,
    categoryId: null,
    confidence: "medium",
    ...overrides,
  };
}

describe("goal suggestions schema", () => {
  it("accepts 2–4 valid suggestions", () => {
    const result = validateGoalSuggestionsResult(
      {
        suggestions: [
          validSuggestion({ id: "a", targetValue: 45 }),
          validSuggestion({ id: "b", targetValue: 60 }),
        ],
      },
      baseContext,
    );
    expect(result).toHaveLength(2);
    expect(result[1].targetValue).toBe(60);
  });

  it("rejects invalid metric", () => {
    expect(
      validateGoalSuggestionItem(validSuggestion({ metric: "bad_metric" })),
    ).toBeNull();
  });

  it("rejects invalid period", () => {
    expect(
      validateGoalSuggestionItem(
        validSuggestion({ period: "monthly", goalType: "recurring" }),
      ),
    ).toBeNull();
  });

  it("rejects invalid goalType", () => {
    expect(
      validateGoalSuggestionItem(
        validSuggestion({ goalType: "lifetime", period: "daily" }),
      ),
    ).toBeNull();
  });

  it("rejects non-positive targetValue", () => {
    expect(
      validateGoalSuggestionItem(validSuggestion({ targetValue: 0 })),
    ).toBeNull();
    expect(
      validateGoalSuggestionItem(validSuggestion({ targetValue: -5 })),
    ).toBeNull();
  });

  it("accepts numeric string targetValue", () => {
    expect(
      validateGoalSuggestionItem(validSuggestion({ targetValue: "45" }))?.targetValue,
    ).toBe(45);
  });

  it("requires integer targetValue for count metrics", () => {
    expect(
      validateGoalSuggestionItem(
        validSuggestion({
          metric: "completed_blocks_count",
          targetValue: 2.5,
        }),
      ),
    ).toBeNull();
    expect(
      validateGoalSuggestionItem(
        validSuggestion({
          metric: "focus_sessions_count",
          targetValue: "3",
        }),
      ),
    ).not.toBeNull();
  });

  it("rejects unknown categoryId", () => {
    expect(
      validateGoalSuggestionItem(validSuggestion({ categoryId: "unknown" }), new Set(["cat-1"])),
    ).toBeNull();
    expect(
      validateGoalSuggestionItem(validSuggestion({ categoryId: "cat-1" }), new Set(["cat-1"]))
        ?.categoryId,
    ).toBe("cat-1");
  });

  it("dedupes identical suggestions and drops active goal overlaps", () => {
    const result = validateGoalSuggestionsResult(
      {
        suggestions: [
          validSuggestion({ id: "a" }),
          validSuggestion({ id: "b" }),
          validSuggestion({
            id: "c",
            metric: "time_block_minutes",
            period: "daily",
            categoryId: "cat-1",
            targetValue: 90,
          }),
          validSuggestion({ id: "d", metric: "focus_sessions_count", targetValue: 4 }),
        ],
      },
      baseContext,
    );

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.metric)).toEqual([
      "focus_minutes",
      "focus_sessions_count",
    ]);
  });

  it("caps results at four suggestions", () => {
    const result = validateGoalSuggestionsResult(
      {
        suggestions: [
          validSuggestion({ id: "a", targetValue: 30 }),
          validSuggestion({ id: "b", targetValue: 45 }),
          validSuggestion({ id: "c", targetValue: 60 }),
          validSuggestion({ id: "d", targetValue: 75 }),
          validSuggestion({ id: "e", targetValue: 90 }),
        ],
      },
      baseContext,
    );

    expect(result).toHaveLength(4);
  });

  it("throws when fewer than 2 valid suggestions remain", () => {
    expect(() =>
      validateGoalSuggestionsResult(
        { suggestions: [validSuggestion({ metric: "bad" })] },
        baseContext,
      ),
    ).toThrow(GoalSuggestionsValidationError);

    expect(() =>
      finalizeGoalSuggestions(
        [validateGoalSuggestionItem(validSuggestion())!],
        baseContext,
      ),
    ).toThrow(GoalSuggestionsValidationError);
  });
});
