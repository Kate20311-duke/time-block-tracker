import { describe, expect, it } from "vitest";

import { generateFallbackGoalSuggestions } from "@/lib/assistant/goal-suggestions-mock";
import type { GoalSuggestionsContext } from "@/lib/assistant/goal-suggestions-types";
import { goalPrefillToFormDefaults, suggestionToFormDefaults } from "@/lib/goal-prefill";

const emptyContext: GoalSuggestionsContext = {
  timezone: "UTC",
  rangeStart: "2026-06-01",
  rangeEnd: "2026-06-14",
  rangeDays: 14,
  categories: [],
  timeBlocks: {
    totalRecordedMinutes: 0,
    completedBlocksCount: 0,
    avgDailyMinutes: 0,
    avgDailyCompletedBlocks: 0,
    categoryBreakdown: [],
  },
  focus: {
    totalMinutes: 0,
    completedSessionCount: 0,
    avgDailyMinutes: 0,
    avgDailySessions: 0,
    categoryBreakdown: [],
  },
  activeGoals: [],
  dataScopeNote: "scope",
};

describe("goal prefill", () => {
  it("converts minute-metric AI suggestions to hour form input", () => {
    const defaults = suggestionToFormDefaults(
      {
        title: "Daily focus",
        description: "Focus more",
        metric: "focus_minutes",
        goalType: "recurring",
        period: "daily",
        targetValue: 45,
        categoryId: null,
      },
      "2026-06-13",
    );

    expect(defaults.title).toBe("Daily focus");
    expect(defaults.targetHours).toBe("0.8");
    expect(defaults.startDate).toBe("2026-06-13");
    expect(defaults.goalType).toBe("recurring");
    expect(defaults.period).toBe("daily");
    expect(defaults.categoryId).toBeNull();
  });

  it("maps count metrics to integer form input", () => {
    const defaults = goalPrefillToFormDefaults({
      title: "Blocks",
      description: "",
      metric: "completed_blocks_count",
      goalType: "recurring",
      period: "daily",
      targetMinutes: 3,
      startDate: "2026-06-13",
    });
    expect(defaults.targetHours).toBe("3");
  });

  it("maps each metric type to the correct form target input", () => {
    expect(
      suggestionToFormDefaults(
        {
          title: "Time",
          description: "",
          metric: "time_block_minutes",
          goalType: "recurring",
          period: "weekly",
          targetValue: 120,
          categoryId: null,
        },
        "2026-06-13",
      ).targetHours,
    ).toBe("2");

    expect(
      suggestionToFormDefaults(
        {
          title: "Sessions",
          description: "",
          metric: "focus_sessions_count",
          goalType: "recurring",
          period: "weekly",
          targetValue: 5,
          categoryId: "cat-1",
        },
        "2026-06-13",
      ).targetHours,
    ).toBe("5");
  });

  it("does not include submit-side create behavior in defaults", () => {
    const defaults = suggestionToFormDefaults(
      {
        title: "Draft",
        description: "Draft only",
        metric: "focus_minutes",
        goalType: "recurring",
        period: "daily",
        targetValue: 30,
        categoryId: null,
      },
      "2026-06-13",
    );

    expect(defaults).not.toHaveProperty("submit");
    expect(defaults.endDate).toBe("");
  });
});

describe("fallback goal suggestions", () => {
  it("returns at least 2 starter suggestions when data is sparse", () => {
    const suggestions = generateFallbackGoalSuggestions({
      context: emptyContext,
      locale: "en",
    });
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    expect(suggestions.every((item) => item.targetValue > 0)).toBe(true);
  });

  it("does not return duplicate cards in one response", () => {
    const suggestions = generateFallbackGoalSuggestions({
      context: {
        ...emptyContext,
        timeBlocks: {
          totalRecordedMinutes: 600,
          completedBlocksCount: 10,
          avgDailyMinutes: 43,
          avgDailyCompletedBlocks: 1,
          categoryBreakdown: [
            {
              categoryId: "cat-1",
              name: "Study",
              minutes: 420,
              completedBlocks: 8,
              focusMinutes: 0,
              focusSessions: 0,
            },
          ],
        },
        focus: {
          totalMinutes: 180,
          completedSessionCount: 6,
          avgDailyMinutes: 13,
          avgDailySessions: 0.4,
          categoryBreakdown: [
            {
              categoryId: "cat-1",
              name: "Study",
              minutes: 0,
              completedBlocks: 0,
              focusMinutes: 120,
              focusSessions: 4,
            },
          ],
        },
        categories: [{ id: "cat-1", name: "Study" }],
      },
      locale: "en",
    });

    const keys = suggestions.map(
      (item) => `${item.metric}|${item.period}|${item.categoryId ?? ""}|${item.targetValue}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
