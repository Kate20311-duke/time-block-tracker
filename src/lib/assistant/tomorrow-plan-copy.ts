import {
  formatPlanTimeRange,
  getSuggestedBlockKey,
} from "@/lib/assistant/tomorrow-plan-ui";
import type { TomorrowPlanBlockDraft } from "@/lib/assistant/tomorrow-plan-types";
import type { Dictionary, Locale } from "@/lib/i18n/types";

export function formatSelectedPlanPlainText(params: {
  date: string;
  generatedGoal: string;
  blocks: readonly TomorrowPlanBlockDraft[];
  labels: Dictionary["assistant"];
  locale: Locale;
  timeZone: string;
}): string {
  const { date, generatedGoal, blocks, labels, locale, timeZone } = params;
  const dateLabel = locale === "zh" ? "日期" : "Date";
  const goalLabel = locale === "zh" ? "目标" : "Goal";

  const lines = [
    `${labels.pageTitle} · ${labels.tomorrowPlanCopyTitle}`,
    "",
    `${dateLabel}：${date}`,
    `${goalLabel}：${generatedGoal}`,
    "",
    labels.tomorrowPlanCopySelectedHeader,
  ];

  blocks.forEach((block, index) => {
    const time = formatPlanTimeRange(
      block.startTime,
      block.endTime,
      locale,
      timeZone,
    );
    const category =
      block.categoryName ?? labels.tomorrowPlanNoCategory;
    lines.push(
      `${index + 1}. ${time} ${block.title}`,
      `   ${labels.tomorrowPlanCategoryLabel}：${category}`,
      `   ${labels.tomorrowPlanReasonLabel}：${block.reason}`,
      "",
    );
  });

  lines.push(labels.tomorrowPlanCopyFooter);
  return lines.join("\n").trim();
}

export function filterBlocksByKeys(
  blocks: readonly TomorrowPlanBlockDraft[],
  selectedKeys: ReadonlySet<string>,
): TomorrowPlanBlockDraft[] {
  return blocks.filter((block) =>
    selectedKeys.has(getSuggestedBlockKey(block)),
  );
}
