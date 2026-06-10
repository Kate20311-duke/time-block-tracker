import "server-only";

import { generateTimeReview } from "@/lib/assistant/time-review-generate";
import { getTimeReviewSummary } from "@/lib/assistant/time-review-summary";
import {
  defaultLastSevenDayParams,
  validateReviewRangeParams,
  type ReviewRangeParams,
  type ReviewRangeValidationError,
} from "@/lib/assistant/time-review-range";
import type { TimeReviewResponse } from "@/lib/assistant/weekly-review-types";
import type { Locale } from "@/lib/i18n/types";

export type TimeReviewHandlerError =
  | { code: ReviewRangeValidationError }
  | { code: "internal" };

export async function handleTimeReviewRequest(params: {
  userId: string;
  timeZone: string;
  locale: Locale;
  startDate?: string;
  endDate?: string;
}): Promise<
  | { ok: true; data: TimeReviewResponse }
  | { ok: false; error: TimeReviewHandlerError }
> {
  const range: ReviewRangeParams =
    params.startDate && params.endDate
      ? { startDate: params.startDate, endDate: params.endDate }
      : defaultLastSevenDayParams(params.timeZone);

  const validation = validateReviewRangeParams(
    range.startDate,
    range.endDate,
    params.timeZone,
  );
  if (!validation.ok) {
    return { ok: false, error: { code: validation.error } };
  }

  try {
    const summary = await getTimeReviewSummary({
      userId: params.userId,
      timeZone: params.timeZone,
      locale: params.locale,
      range,
    });

    if (summary.dataQuality.level === "empty") {
      return {
        ok: true,
        data: {
          summary,
          review: {
            dataScopeNote: summary.dataScopeNote,
            summary: "",
            findings: [],
            potentialIssues: [],
            positives: [],
            suggestions: [],
            actionItems: [],
          },
          source: "mock",
        },
      };
    }

    const { review, source } = await generateTimeReview(summary, params.locale);

    return {
      ok: true,
      data: { summary, review, source },
    };
  } catch {
    return { ok: false, error: { code: "internal" } };
  }
}
