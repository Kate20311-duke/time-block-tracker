import "server-only";

export {
  generateTimeReview,
  type TimeReviewGenerateResult,
} from "@/lib/assistant/time-review-generate";

/** @deprecated Use generateTimeReview */
export { generateTimeReview as generateWeeklyReview } from "@/lib/assistant/time-review-generate";

/** @deprecated Use TimeReviewGenerateResult */
export type { TimeReviewGenerateResult as WeeklyReviewGenerateResult } from "@/lib/assistant/time-review-generate";
