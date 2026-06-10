import type { TimeReviewDataQuality } from "@/lib/assistant/weekly-review-types";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

export function computeDataQuality(
  totalRecordedMinutes: number,
  recordedDays: number,
  rangeDays: number,
  locale: Locale,
): TimeReviewDataQuality {
  const notes = getDictionary(locale).assistant;

  let level: TimeReviewDataQuality["level"];
  if (totalRecordedMinutes === 0) {
    level = "empty";
  } else if (totalRecordedMinutes < 60 || recordedDays <= 1) {
    level = "low";
  } else if (
    totalRecordedMinutes < 300 ||
    recordedDays < Math.min(3, rangeDays)
  ) {
    level = "medium";
  } else {
    level = "good";
  }

  const noteByLevel: Record<TimeReviewDataQuality["level"], string> = {
    empty: notes.dataQualityEmptyNote,
    low: notes.dataQualityLowNote,
    medium: notes.dataQualityMediumNote,
    good: notes.dataQualityGoodNote,
  };

  return {
    level,
    recordedDays,
    rangeDays,
    note: noteByLevel[level],
  };
}
