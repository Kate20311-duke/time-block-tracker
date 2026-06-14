import type { GoalMetric, GoalPeriodKind, GoalType } from "@/lib/constants";
import type { TimeReviewSource } from "@/lib/assistant/weekly-review-types";

export const GOAL_SUGGESTION_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export type GoalSuggestionConfidence =
  (typeof GOAL_SUGGESTION_CONFIDENCE_LEVELS)[number];

export const GOAL_SUGGESTIONS_MIN_COUNT = 2;
export const GOAL_SUGGESTIONS_MAX_COUNT = 4;
export const GOAL_SUGGESTIONS_CONTEXT_DAYS = 14;

export const GOAL_SUGGESTION_TITLE_MAX_LENGTH = 120;
export const GOAL_SUGGESTION_DESCRIPTION_MAX_LENGTH = 500;
export const GOAL_SUGGESTION_REASON_MAX_LENGTH = 300;

export type GoalSuggestionDraft = {
  id: string;
  title: string;
  description: string;
  reason: string;
  metric: GoalMetric;
  goalType: GoalType;
  period: GoalPeriodKind;
  /** Minutes for minute metrics; count for count metrics (maps to `targetMinutes`). */
  targetValue: number;
  categoryId: string | null;
  confidence: GoalSuggestionConfidence;
};

export type GoalSuggestionsCategoryRow = {
  categoryId: string;
  name: string;
  minutes: number;
  completedBlocks: number;
  focusMinutes: number;
  focusSessions: number;
};

export type GoalSuggestionsActiveGoal = {
  title: string;
  metric: string;
  period: string;
  targetMinutes: number;
  categoryId: string | null;
};

export type GoalSuggestionsContext = {
  timezone: string;
  rangeStart: string;
  rangeEnd: string;
  rangeDays: number;
  categories: { id: string; name: string }[];
  timeBlocks: {
    totalRecordedMinutes: number;
    completedBlocksCount: number;
    avgDailyMinutes: number;
    avgDailyCompletedBlocks: number;
    categoryBreakdown: GoalSuggestionsCategoryRow[];
  };
  focus: {
    totalMinutes: number;
    completedSessionCount: number;
    avgDailyMinutes: number;
    avgDailySessions: number;
    categoryBreakdown: GoalSuggestionsCategoryRow[];
  };
  activeGoals: GoalSuggestionsActiveGoal[];
  dataScopeNote: string;
};

export type GoalSuggestionsResult = {
  suggestions: GoalSuggestionDraft[];
  dataScopeNote: string;
};

export type GoalSuggestionsResponse = GoalSuggestionsResult & {
  source: TimeReviewSource;
};
