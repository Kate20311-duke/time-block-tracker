import type { GoalSuggestionsContext } from "@/lib/assistant/goal-suggestions-types";
import type { Locale } from "@/lib/i18n/types";

const METRIC_DESCRIPTIONS = {
  time_block_minutes:
    "Sum of TimeBlock recorded minutes (completed + partial weighted). Category filter optional.",
  completed_blocks_count:
    "Count TimeBlocks with status=completed only. Category filter optional.",
  focus_minutes:
    "Sum focus minutes from completed/converted FocusSessions only. Not TimeBlocks.",
  focus_sessions_count:
    "Count completed/converted FocusSessions by startTime in period. Not TimeBlocks.",
} as const;

export function buildGoalSuggestionsPrompt(params: {
  context: GoalSuggestionsContext;
  locale: Locale;
}): { system: string; user: string } {
  const { context, locale } = params;
  const localeLabel = locale === "zh" ? "Simplified Chinese" : "English";

  const system = [
    "You are a practical productivity coach for a time-tracking app.",
    "Suggest realistic, incremental goals based ONLY on the user's recent data.",
    "Return JSON only — no markdown.",
    "",
    "Rules:",
    "- Suggest 2 to 4 goals in `suggestions` array.",
    "- Prefer recurring goals with period daily or weekly.",
    "- Only use metrics: time_block_minutes, completed_blocks_count, focus_minutes, focus_sessions_count.",
    "- targetValue: positive number; integer for count metrics.",
    "- Do NOT duplicate active goals (same metric + period + categoryId).",
    "- Prefer small improvements (~10–20%) over aggressive jumps.",
    "- Do NOT invent categories; categoryId must be null or an id from context.categories.",
    "- Keep title under 80 chars; reason concise (1 sentence).",
    `- Write title, description, and reason in ${localeLabel}.`,
    "",
    "Response schema:",
    `{ "suggestions": [{ "id": "string", "title": "string", "description": "string", "reason": "string", "metric": "...", "goalType": "recurring", "period": "daily|weekly", "targetValue": number, "categoryId": null|string, "confidence": "low|medium|high" }] }`,
  ].join("\n");

  const compactContext = {
    timezone: context.timezone,
    range: {
      start: context.rangeStart,
      end: context.rangeEnd,
      days: context.rangeDays,
    },
    categories: context.categories,
    timeBlocks: {
      totalRecordedMinutes: context.timeBlocks.totalRecordedMinutes,
      completedBlocksCount: context.timeBlocks.completedBlocksCount,
      avgDailyMinutes: context.timeBlocks.avgDailyMinutes,
      avgDailyCompletedBlocks: context.timeBlocks.avgDailyCompletedBlocks,
      topCategories: context.timeBlocks.categoryBreakdown.slice(0, 8),
    },
    focus: {
      totalMinutes: context.focus.totalMinutes,
      completedSessionCount: context.focus.completedSessionCount,
      avgDailyMinutes: context.focus.avgDailyMinutes,
      avgDailySessions: context.focus.avgDailySessions,
      topCategories: context.focus.categoryBreakdown.slice(0, 8),
    },
    activeGoals: context.activeGoals,
    metricSemantics: METRIC_DESCRIPTIONS,
  };

  const user = [
    "Based on this user data, suggest practical goal drafts:",
    JSON.stringify(compactContext),
  ].join("\n\n");

  return { system, user };
}
