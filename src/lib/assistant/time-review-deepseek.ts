import "server-only";

import {
  createDeepSeekClient,
  getDeepSeekConfig,
} from "@/lib/assistant/deepseek-client";
import { buildTimeReviewPrompt } from "@/lib/assistant/time-review-prompt";
import {
  parseWeeklyReviewJson,
  validateWeeklyReviewResult,
} from "@/lib/assistant/weekly-review-schema";
import type {
  TimeReviewResult,
  TimeReviewSummary,
} from "@/lib/assistant/weekly-review-types";

const TEMPERATURE = 0.3;
const MAX_TOKENS = 2048;

export async function generateTimeReviewWithDeepSeek(
  summary: TimeReviewSummary,
): Promise<TimeReviewResult> {
  const client = createDeepSeekClient();
  const { model } = getDeepSeekConfig();
  const { system, user } = buildTimeReviewPrompt(summary);

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

  const parsed = parseWeeklyReviewJson(content);
  return validateWeeklyReviewResult(parsed, summary.dataScopeNote);
}

/** @deprecated Use generateTimeReviewWithDeepSeek */
export const generateWeeklyReviewWithDeepSeek = generateTimeReviewWithDeepSeek;
