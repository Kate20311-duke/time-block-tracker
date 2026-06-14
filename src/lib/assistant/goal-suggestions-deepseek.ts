import "server-only";

import {
  createDeepSeekClient,
  getDeepSeekConfig,
} from "@/lib/assistant/deepseek-client";
import { buildGoalSuggestionsPrompt } from "@/lib/assistant/goal-suggestions-prompt";
import {
  parseGoalSuggestionsJson,
  validateGoalSuggestionsResult,
} from "@/lib/assistant/goal-suggestions-schema";
import type {
  GoalSuggestionDraft,
  GoalSuggestionsContext,
} from "@/lib/assistant/goal-suggestions-types";
import type { Locale } from "@/lib/i18n/types";

const TEMPERATURE = 0.3;
const MAX_TOKENS = 2048;

export async function generateGoalSuggestionsWithDeepSeek(params: {
  context: GoalSuggestionsContext;
  locale: Locale;
}): Promise<GoalSuggestionDraft[]> {
  const client = createDeepSeekClient();
  const { model } = getDeepSeekConfig();
  const { system, user } = buildGoalSuggestionsPrompt(params);

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    response_format: { type: "json_object" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...( { extra_body: { thinking: { type: "disabled" } } } as any ),
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("DeepSeek returned empty content");
  }

  if (completion.choices[0]?.finish_reason === "length") {
    throw new Error("DeepSeek response was truncated");
  }

  const parsed = parseGoalSuggestionsJson(content);
  return validateGoalSuggestionsResult(parsed, params.context);
}
