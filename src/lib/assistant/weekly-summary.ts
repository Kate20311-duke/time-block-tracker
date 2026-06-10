import "server-only";

import { defaultLastSevenDayParams } from "@/lib/assistant/time-review-range";
import { getTimeReviewSummary } from "@/lib/assistant/time-review-summary";
import type { TimeReviewSummary } from "@/lib/assistant/weekly-review-types";
import type { Locale } from "@/lib/i18n/types";

/** @deprecated Use getTimeReviewSummary */
export async function getWeeklyReviewSummary(
  userId: string,
  timeZone: string,
  locale: Locale = "zh",
  now: Date = new Date(),
): Promise<TimeReviewSummary> {
  return getTimeReviewSummary({
    userId,
    timeZone,
    locale,
    range: defaultLastSevenDayParams(timeZone, now),
    now,
  });
}
