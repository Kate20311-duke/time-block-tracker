import "server-only";

import { getGoalSuggestionsContext } from "@/lib/assistant/goal-suggestions-context";
import { generateGoalSuggestions } from "@/lib/assistant/goal-suggestions-generate";
import type { GoalSuggestionsResponse } from "@/lib/assistant/goal-suggestions-types";
import type { Locale } from "@/lib/i18n/types";

export async function handleGoalSuggestionsRequest(params: {
  userId: string;
  timeZone: string;
  locale: Locale;
}): Promise<{ ok: true; data: GoalSuggestionsResponse } | { ok: false }> {
  try {
    const context = await getGoalSuggestionsContext({
      userId: params.userId,
      timeZone: params.timeZone,
      locale: params.locale,
    });
    const result = await generateGoalSuggestions({
      context,
      locale: params.locale,
    });

    return { ok: true, data: result };
  } catch {
    return { ok: false };
  }
}
