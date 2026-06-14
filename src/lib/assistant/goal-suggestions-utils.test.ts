import { describe, expect, it } from "vitest";

import {
  dedupeGoalSuggestions,
  ensureUniqueSuggestionIds,
  goalSuggestionIdentityKey,
  matchesActiveGoal,
} from "./goal-suggestions-utils";
import type { GoalSuggestionDraft } from "./goal-suggestions-types";

function draft(
  overrides: Partial<GoalSuggestionDraft> = {},
): GoalSuggestionDraft {
  return {
    id: "s1",
    title: "Daily focus",
    description: "Focus daily",
    reason: "Recent focus",
    metric: "focus_minutes",
    goalType: "recurring",
    period: "daily",
    targetValue: 30,
    categoryId: null,
    confidence: "medium",
    ...overrides,
  };
}

describe("goal suggestions utils", () => {
  it("builds stable identity keys", () => {
    expect(
      goalSuggestionIdentityKey({
        metric: "focus_minutes",
        period: "daily",
        categoryId: "cat-1",
        targetValue: 30,
      }),
    ).toBe("focus_minutes|daily|cat-1|30");
  });

  it("detects active goal overlap by metric, period, and category", () => {
    expect(
      matchesActiveGoal(draft({ categoryId: "cat-1" }), [
        {
          title: "Existing",
          metric: "focus_minutes",
          period: "daily",
          targetMinutes: 45,
          categoryId: "cat-1",
        },
      ]),
    ).toBe(true);
    expect(
      matchesActiveGoal(draft({ targetValue: 60 }), [
        {
          title: "Existing",
          metric: "focus_minutes",
          period: "daily",
          targetMinutes: 45,
          categoryId: null,
        },
      ]),
    ).toBe(true);
  });

  it("dedupes identical suggestions and active overlaps", () => {
    const context = {
      activeGoals: [
        {
          title: "Existing",
          metric: "completed_blocks_count",
          period: "daily",
          targetMinutes: 2,
          categoryId: null,
        },
      ],
    };

    const result = dedupeGoalSuggestions(
      [
        draft(),
        draft({ id: "s2" }),
        draft({ id: "s3", metric: "completed_blocks_count", targetValue: 2 }),
        draft({ id: "s4", metric: "time_block_minutes", targetValue: 120 }),
      ],
      context,
    );

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.metric)).toEqual([
      "focus_minutes",
      "time_block_minutes",
    ]);
  });

  it("assigns unique ids when duplicates appear", () => {
    const result = ensureUniqueSuggestionIds([
      draft({ id: "dup" }),
      draft({ id: "dup", metric: "time_block_minutes", targetValue: 60 }),
    ]);

    expect(result.map((item) => item.id)).toEqual(["dup", "dup-2"]);
  });
});
