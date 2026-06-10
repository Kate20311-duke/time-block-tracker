import "server-only";

import { hasDeepSeekApiKey } from "@/lib/assistant/deepseek-client";
import { generateMockTimeReview } from "@/lib/assistant/time-review-mock";
import { generateTimeReviewWithDeepSeek } from "@/lib/assistant/time-review-deepseek";
import type {
  TimeReviewResult,
  TimeReviewSource,
  TimeReviewSummary,
} from "@/lib/assistant/weekly-review-types";
import type { Locale } from "@/lib/i18n/types";

export type TimeReviewGenerateResult = {
  review: TimeReviewResult;
  source: TimeReviewSource;
};

export async function generateTimeReview(
  summary: TimeReviewSummary,
  locale: Locale,
): Promise<TimeReviewGenerateResult> {
  if (summary.dataQuality.level === "empty") {
    return {
      review: generateMockTimeReview(summary, locale),
      source: "mock",
    };
  }

  if (!hasDeepSeekApiKey()) {
    return {
      review: generateMockTimeReview(summary, locale),
      source: "mock",
    };
  }

  try {
    const review = await generateTimeReviewWithDeepSeek(summary);
    return { review, source: "deepseek" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[time-review] DeepSeek failed:", message);
    return {
      review: generateMockTimeReview(summary, locale),
      source: "fallback",
    };
  }
}
