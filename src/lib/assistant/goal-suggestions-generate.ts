import "server-only";

import { hasDeepSeekApiKey } from "@/lib/assistant/deepseek-client";
import { generateGoalSuggestionsWithDeepSeek } from "@/lib/assistant/goal-suggestions-deepseek";
import {
  generateFallbackGoalSuggestions,
  generateMockGoalSuggestions,
} from "@/lib/assistant/goal-suggestions-mock";
import type {
  GoalSuggestionsContext,
  GoalSuggestionsResult,
} from "@/lib/assistant/goal-suggestions-types";
import type { TimeReviewSource } from "@/lib/assistant/weekly-review-types";
import type { Locale } from "@/lib/i18n/types";

export type GoalSuggestionsGenerateResult = GoalSuggestionsResult & {
  source: TimeReviewSource;
};

export async function generateGoalSuggestions(params: {
  context: GoalSuggestionsContext;
  locale: Locale;
}): Promise<GoalSuggestionsGenerateResult> {
  const fallback = (): GoalSuggestionsGenerateResult => ({
    suggestions: generateFallbackGoalSuggestions(params),
    dataScopeNote: params.context.dataScopeNote,
    source: "fallback",
  });

  if (!hasDeepSeekApiKey()) {
    return {
      suggestions: generateMockGoalSuggestions(params),
      dataScopeNote: params.context.dataScopeNote,
      source: "mock",
    };
  }

  try {
    const suggestions = await generateGoalSuggestionsWithDeepSeek(params);
    return {
      suggestions,
      dataScopeNote: params.context.dataScopeNote,
      source: "deepseek",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[goal-suggestions] DeepSeek failed:", message);
    return fallback();
  }
}
