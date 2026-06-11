import type { TimeReviewSource } from "@/lib/assistant/weekly-review-types";

export type AssistantSourceNoticeKind =
  | "none"
  | "production"
  | "dev-mock"
  | "dev-fallback"
  | "dev-deepseek";

export function getAssistantSourceNoticeKind(
  source: TimeReviewSource,
): AssistantSourceNoticeKind {
  const isDev = process.env.NODE_ENV === "development";

  if (source === "deepseek") {
    return isDev ? "dev-deepseek" : "none";
  }

  if (source === "mock") {
    return isDev ? "dev-mock" : "production";
  }

  if (source === "fallback") {
    return isDev ? "dev-fallback" : "production";
  }

  return "none";
}
