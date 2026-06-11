import "server-only";

import {
  createDeepSeekClient,
  getDeepSeekConfig,
} from "@/lib/assistant/deepseek-client";
import { buildTomorrowPlanPrompt } from "@/lib/assistant/tomorrow-plan-prompt";
import {
  parseTomorrowPlanJson,
  validateTomorrowPlanResult,
} from "@/lib/assistant/tomorrow-plan-schema";
import type {
  TomorrowPlanContext,
  TomorrowPlanResult,
} from "@/lib/assistant/tomorrow-plan-types";
import type { Locale } from "@/lib/i18n/types";

const TEMPERATURE = 0.3;
const MAX_TOKENS = 2048;

export async function generateTomorrowPlanWithDeepSeek(params: {
  userGoal: string;
  context: TomorrowPlanContext;
  locale?: Locale;
}): Promise<TomorrowPlanResult> {
  const client = createDeepSeekClient();
  const { model } = getDeepSeekConfig();
  const { system, user } = buildTomorrowPlanPrompt(params);

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

  const parsed = parseTomorrowPlanJson(content);
  return validateTomorrowPlanResult(
    parsed,
    params.context,
    params.locale ?? "zh",
  );
}
