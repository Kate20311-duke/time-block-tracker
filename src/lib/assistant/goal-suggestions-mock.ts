import {
  goalSuggestionIdentityKey,
  matchesActiveGoal,
  roundUpToNiceCount,
  roundUpToNiceMinutes,
} from "@/lib/assistant/goal-suggestions-utils";
import {
  GOAL_SUGGESTIONS_MAX_COUNT,
  GOAL_SUGGESTIONS_MIN_COUNT,
  type GoalSuggestionDraft,
  type GoalSuggestionsContext,
} from "@/lib/assistant/goal-suggestions-types";
import type { Locale } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n";

function bumpTarget(base: number, isCount: boolean): number {
  const improved = base <= 0 ? (isCount ? 1 : 30) : Math.ceil(base * 1.15);
  return isCount ? roundUpToNiceCount(improved) : roundUpToNiceMinutes(improved);
}

function pushSuggestion(
  list: GoalSuggestionDraft[],
  context: GoalSuggestionsContext,
  draft: Omit<GoalSuggestionDraft, "id">,
): void {
  if (list.length >= GOAL_SUGGESTIONS_MAX_COUNT) return;
  if (matchesActiveGoal(draft, context.activeGoals)) return;

  const key = goalSuggestionIdentityKey(draft);
  if (list.some((item) => goalSuggestionIdentityKey(item) === key)) return;

  list.push({ ...draft, id: `fallback-${list.length + 1}` });
}

/** Rule-based suggestions used when AI is unavailable or validation fails. */
export function generateFallbackGoalSuggestions(params: {
  context: GoalSuggestionsContext;
  locale: Locale;
}): GoalSuggestionDraft[] {
  const { context, locale } = params;
  const t = getDictionary(locale).goals.aiSuggestions.fallback;
  const suggestions: GoalSuggestionDraft[] = [];

  const topTimeCategory = context.timeBlocks.categoryBreakdown[0];
  if (topTimeCategory && topTimeCategory.minutes >= 60) {
    const dailyBase = topTimeCategory.minutes / context.rangeDays;
    const target = bumpTarget(dailyBase, false);
    pushSuggestion(suggestions, context, {
      title: t.dailyCategoryTimeTitle.replace("{category}", topTimeCategory.name),
      description: t.dailyCategoryTimeDescription.replace(
        "{category}",
        topTimeCategory.name,
      ),
      reason: t.dailyCategoryTimeReason
        .replace("{avg}", String(Math.round(dailyBase)))
        .replace("{days}", String(context.rangeDays)),
      metric: "time_block_minutes",
      goalType: "recurring",
      period: "daily",
      targetValue: target,
      categoryId: topTimeCategory.categoryId,
      confidence: dailyBase >= 30 ? "medium" : "low",
    });
  } else if (context.timeBlocks.avgDailyMinutes >= 15) {
    const target = bumpTarget(context.timeBlocks.avgDailyMinutes, false);
    pushSuggestion(suggestions, context, {
      title: t.dailyOverallTimeTitle,
      description: t.dailyOverallTimeDescription,
      reason: t.dailyOverallTimeReason
        .replace("{avg}", String(context.timeBlocks.avgDailyMinutes))
        .replace("{days}", String(context.rangeDays)),
      metric: "time_block_minutes",
      goalType: "recurring",
      period: "daily",
      targetValue: target,
      categoryId: null,
      confidence: "medium",
    });
  }

  if (context.timeBlocks.completedBlocksCount >= 3) {
    const dailyBase = context.timeBlocks.completedBlocksCount / context.rangeDays;
    const target = bumpTarget(dailyBase, true);
    if (target >= 1) {
      pushSuggestion(suggestions, context, {
        title: t.dailyCompletedBlocksTitle,
        description: t.dailyCompletedBlocksDescription,
        reason: t.dailyCompletedBlocksReason
          .replace("{avg}", String(Math.round(dailyBase * 10) / 10))
          .replace("{days}", String(context.rangeDays)),
        metric: "completed_blocks_count",
        goalType: "recurring",
        period: "daily",
        targetValue: target,
        categoryId: null,
        confidence: "medium",
      });
    }
  }

  const topFocusCategory = context.focus.categoryBreakdown[0];
  if (topFocusCategory && topFocusCategory.focusMinutes >= 30) {
    const dailyBase = topFocusCategory.focusMinutes / context.rangeDays;
    const target = bumpTarget(dailyBase, false);
    pushSuggestion(suggestions, context, {
      title: t.dailyFocusMinutesTitle.replace("{category}", topFocusCategory.name),
      description: t.dailyFocusMinutesDescription.replace(
        "{category}",
        topFocusCategory.name,
      ),
      reason: t.dailyFocusMinutesReason
        .replace("{avg}", String(Math.round(dailyBase)))
        .replace("{days}", String(context.rangeDays)),
      metric: "focus_minutes",
      goalType: "recurring",
      period: "daily",
      targetValue: target,
      categoryId: topFocusCategory.categoryId,
      confidence: "medium",
    });
  } else if (context.focus.avgDailyMinutes >= 10) {
    const target = bumpTarget(context.focus.avgDailyMinutes, false);
    pushSuggestion(suggestions, context, {
      title: t.dailyFocusOverallTitle,
      description: t.dailyFocusOverallDescription,
      reason: t.dailyFocusOverallReason
        .replace("{avg}", String(context.focus.avgDailyMinutes))
        .replace("{days}", String(context.rangeDays)),
      metric: "focus_minutes",
      goalType: "recurring",
      period: "daily",
      targetValue: target,
      categoryId: null,
      confidence: "medium",
    });
  }

  if (context.focus.completedSessionCount >= 2) {
    const weeklyBase =
      (context.focus.completedSessionCount / context.rangeDays) * 7;
    const target = bumpTarget(weeklyBase, true);
    if (target >= 1) {
      pushSuggestion(suggestions, context, {
        title: t.weeklyFocusSessionsTitle,
        description: t.weeklyFocusSessionsDescription,
        reason: t.weeklyFocusSessionsReason
          .replace("{count}", String(context.focus.completedSessionCount))
          .replace("{days}", String(context.rangeDays)),
        metric: "focus_sessions_count",
        goalType: "recurring",
        period: "weekly",
        targetValue: target,
        categoryId: null,
        confidence: "low",
      });
    }
  }

  if (context.timeBlocks.totalRecordedMinutes >= 300) {
    const weeklyBase =
      (context.timeBlocks.totalRecordedMinutes / context.rangeDays) * 7;
    const target = bumpTarget(weeklyBase, false);
    pushSuggestion(suggestions, context, {
      title: t.weeklyOverallTimeTitle,
      description: t.weeklyOverallTimeDescription,
      reason: t.weeklyOverallTimeReason
        .replace("{minutes}", String(context.timeBlocks.totalRecordedMinutes))
        .replace("{days}", String(context.rangeDays)),
      metric: "time_block_minutes",
      goalType: "recurring",
      period: "weekly",
      targetValue: target,
      categoryId: null,
      confidence: "low",
    });
  }

  if (suggestions.length < GOAL_SUGGESTIONS_MIN_COUNT) {
    pushSuggestion(suggestions, context, {
      title: t.starterDailyFocusTitle,
      description: t.starterDailyFocusDescription,
      reason: t.starterDailyFocusReason.replace("{days}", String(context.rangeDays)),
      metric: "focus_minutes",
      goalType: "recurring",
      period: "daily",
      targetValue: 30,
      categoryId: null,
      confidence: "low",
    });
    pushSuggestion(suggestions, context, {
      title: t.starterDailyBlocksTitle,
      description: t.starterDailyBlocksDescription,
      reason: t.starterDailyBlocksReason.replace("{days}", String(context.rangeDays)),
      metric: "completed_blocks_count",
      goalType: "recurring",
      period: "daily",
      targetValue: 1,
      categoryId: null,
      confidence: "low",
    });
  }

  return suggestions.slice(0, GOAL_SUGGESTIONS_MAX_COUNT);
}

export function generateMockGoalSuggestions(params: {
  context: GoalSuggestionsContext;
  locale: Locale;
}): GoalSuggestionDraft[] {
  return generateFallbackGoalSuggestions(params);
}
