import type {
  TimeReviewResponse,
  TimeReviewResult,
} from "@/lib/assistant/weekly-review-types";
import { formatMessage } from "@/lib/i18n";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { formatDurationMinutes } from "@/lib/time";

function formatListSection(title: string, items: string[]): string {
  if (items.length === 0) return "";
  const lines = items.map((item, index) => `${index + 1}. ${item}`);
  return `${title}：\n${lines.join("\n")}`;
}

function formatActionItems(
  title: string,
  items: TimeReviewResult["actionItems"],
): string {
  if (items.length === 0) return "";
  const lines = items.map(
    (item, index) => `${index + 1}. ${item.title}：${item.description}`,
  );
  return `${title}：\n${lines.join("\n")}`;
}

export function formatWeeklyReviewPlainText(
  response: TimeReviewResponse,
  labels: Dictionary["assistant"],
  locale: Locale,
): string {
  const { summary, review } = response;
  const dataScopeNote =
    review.dataScopeNote.trim() ||
    summary.dataScopeNote.trim() ||
    labels.dataScopeNote;
  const dateSeparator = locale === "zh" ? "至" : "to";

  const recordedLabel = formatDurationMinutes(
    summary.totalRecordedMinutes,
    locale,
  );
  const categoriesLabel =
    summary.activeCategories.length > 0
      ? summary.activeCategories.map((c) => c.name).join(
          locale === "zh" ? "、" : ", ",
        )
      : labels.noCategoriesUsed;

  const sections = [
    `${labels.pageTitle} · ${labels.copyTitle}`,
    "",
    `${labels.dataRangeLabel}：${summary.range.start} ${dateSeparator} ${summary.range.end}`,
  ];

  if (
    summary.dataQuality.level === "low" ||
    summary.dataQuality.level === "medium"
  ) {
    sections.push(`${labels.dataQualityLabel}：${summary.dataQuality.note}`);
  }

  sections.push(
    `${labels.dataScopeLabel}：${dataScopeNote}`,
    "",
    `${labels.recordedTotal}：${recordedLabel}`,
    `${labels.categoriesUsed}：${categoriesLabel}`,
    formatMessage(labels.focusSessionsStat, {
      total: String(summary.focusSessions.totalCount),
      completed: String(summary.focusSessions.completedCount),
    }),
    "",
    `${labels.summarySection}：`,
    review.summary,
    "",
    formatListSection(labels.findingsSection, review.findings),
    "",
    formatListSection(labels.potentialIssuesSection, review.potentialIssues),
    "",
    formatListSection(labels.positivesSection, review.positives),
    "",
    formatListSection(labels.suggestionsSection, review.suggestions),
    "",
    formatActionItems(labels.actionItemsSection, review.actionItems),
  );

  return sections.filter((line) => line !== "").join("\n");
}
