import type { GoalFormDefaults } from "@/components/goals/goal-form-fields";
import type { GoalSuggestionDraft } from "@/lib/assistant/goal-suggestions-types";
import type { GoalMetric } from "@/lib/constants";
import { goalTargetToFormInput } from "@/lib/goals-metric-display";

export type GoalPrefillInput = {
  title: string;
  description: string;
  categoryId?: string | null;
  metric: GoalMetric;
  goalType: "one_time" | "recurring";
  period: "once" | "daily" | "weekly";
  /** Stored as `targetMinutes` in the database (minutes or count). */
  targetMinutes: number;
  startDate: string;
};

/** Convert template or AI suggestion data into create-form defaults (does not submit). */
export function goalPrefillToFormDefaults(input: GoalPrefillInput): GoalFormDefaults {
  return {
    title: input.title,
    description: input.description,
    categoryId: input.categoryId ?? null,
    targetHours: goalTargetToFormInput(input.metric, input.targetMinutes),
    startDate: input.startDate,
    endDate: "",
    goalType: input.goalType,
    period: input.period,
  };
}

/** Convert a validated AI suggestion into create-form defaults (does not submit). */
export function suggestionToFormDefaults(
  suggestion: Pick<
    GoalSuggestionDraft,
    | "title"
    | "description"
    | "metric"
    | "goalType"
    | "period"
    | "targetValue"
    | "categoryId"
  >,
  startDate: string,
): GoalFormDefaults {
  return goalPrefillToFormDefaults({
    title: suggestion.title,
    description: suggestion.description,
    categoryId: suggestion.categoryId,
    metric: suggestion.metric,
    goalType: suggestion.goalType,
    period: suggestion.period,
    targetMinutes: suggestion.targetValue,
    startDate,
  });
}
