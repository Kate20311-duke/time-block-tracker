import type { Locale } from "@/lib/i18n/types";
import { formatBlockDurationInRange } from "@/lib/stats";
import type { ReviewTimeBlockListItem } from "@/components/review/review-time-block-list";

type TimeBlockEntity = {
  id: string;
  title: string;
  status: string;
  startTime: Date;
  endTime: Date;
  reviewNote: string | null;
  category: { name: string; color: string };
};

export function mapReviewTimeBlockListItems(
  blocks: TimeBlockEntity[],
  rangeStart: Date,
  rangeEnd: Date,
  userTimeZone: string,
  locale: Locale,
  scope: "day" | "week",
): ReviewTimeBlockListItem[] {
  const timeFormatter = new Intl.DateTimeFormat(
    locale === "zh" ? "zh-CN" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: userTimeZone,
    },
  );

  return blocks.map((block) => ({
    id: block.id,
    title: block.title,
    status: block.status,
    categoryName: block.category.name,
    categoryColor: block.category.color,
    durationLabel: formatBlockDurationInRange(
      block.startTime,
      block.endTime,
      rangeStart,
      rangeEnd,
      locale,
      scope,
    ),
    timeRangeLabel: `${timeFormatter.format(block.startTime)} – ${timeFormatter.format(block.endTime)}`,
    reviewNote: block.reviewNote,
  }));
}

export function countCompletedBlocks(
  blocks: readonly { status: string }[],
): number {
  return blocks.filter((block) => block.status === "completed").length;
}
