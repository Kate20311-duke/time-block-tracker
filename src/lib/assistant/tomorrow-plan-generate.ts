import "server-only";

import { hasDeepSeekApiKey } from "@/lib/assistant/deepseek-client";
import { generateTomorrowPlanWithDeepSeek } from "@/lib/assistant/tomorrow-plan-deepseek";
import { generateMockTomorrowPlan } from "@/lib/assistant/tomorrow-plan-mock";
import type {
  TomorrowPlanContext,
  TomorrowPlanResult,
} from "@/lib/assistant/tomorrow-plan-types";
import type { TimeReviewSource } from "@/lib/assistant/weekly-review-types";
import type { Locale } from "@/lib/i18n/types";

export type TomorrowPlanGenerateResult = {
  plan: TomorrowPlanResult;
  source: TimeReviewSource;
};

export async function generateTomorrowPlan(params: {
  userGoal: string;
  context: TomorrowPlanContext;
  locale: Locale;
}): Promise<TomorrowPlanGenerateResult> {
  const mock = () =>
    generateMockTomorrowPlan({
      userGoal: params.userGoal,
      context: params.context,
      locale: params.locale,
    });

  if (!hasDeepSeekApiKey()) {
    return { plan: mock(), source: "mock" };
  }

  try {
    const plan = await generateTomorrowPlanWithDeepSeek(params);
    if (plan.suggestedBlocks.length === 0) {
      return { plan: mock(), source: "fallback" };
    }
    return { plan, source: "deepseek" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[tomorrow-plan] DeepSeek failed:", message);
    return { plan: mock(), source: "fallback" };
  }
}
