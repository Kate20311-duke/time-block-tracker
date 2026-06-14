import type {
  GoalSuggestionDraft,
  GoalSuggestionsActiveGoal,
  GoalSuggestionsContext,
} from "@/lib/assistant/goal-suggestions-types";

export function roundUpToNiceMinutes(value: number): number {
  if (value <= 0) return 0;
  if (value <= 30) return Math.max(15, Math.ceil(value / 5) * 5);
  if (value <= 120) return Math.ceil(value / 15) * 15;
  return Math.ceil(value / 30) * 30;
}

export function roundUpToNiceCount(value: number): number {
  if (value <= 0) return 0;
  if (value <= 5) return Math.max(1, Math.ceil(value));
  return Math.ceil(value / 2) * 2;
}

export function goalSuggestionIdentityKey(
  item: Pick<GoalSuggestionDraft, "metric" | "period" | "categoryId" | "targetValue">,
): string {
  return `${item.metric}|${item.period}|${item.categoryId ?? ""}|${item.targetValue}`;
}

export function matchesActiveGoal(
  item: Pick<GoalSuggestionDraft, "metric" | "period" | "categoryId">,
  activeGoals: readonly GoalSuggestionsActiveGoal[],
): boolean {
  return activeGoals.some(
    (goal) =>
      goal.metric === item.metric &&
      goal.period === item.period &&
      (goal.categoryId ?? null) === (item.categoryId ?? null),
  );
}

export function dedupeGoalSuggestions(
  suggestions: readonly GoalSuggestionDraft[],
  context?: Pick<GoalSuggestionsContext, "activeGoals">,
): GoalSuggestionDraft[] {
  const seen = new Set<string>();
  const result: GoalSuggestionDraft[] = [];

  for (const item of suggestions) {
    if (context && matchesActiveGoal(item, context.activeGoals)) continue;
    const key = goalSuggestionIdentityKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function ensureUniqueSuggestionIds(
  suggestions: readonly GoalSuggestionDraft[],
): GoalSuggestionDraft[] {
  const used = new Set<string>();

  return suggestions.map((item, index) => {
    let id = item.id.trim() || `suggestion-${index + 1}`;
    if (used.has(id)) {
      id = `${id}-${index + 1}`;
    }
    used.add(id);
    return id === item.id ? item : { ...item, id };
  });
}
