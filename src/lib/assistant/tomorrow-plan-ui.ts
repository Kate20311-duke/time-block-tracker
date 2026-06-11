import type { TomorrowPlanCreatedBlock } from "@/lib/assistant/tomorrow-plan-apply-types";
import type { ExistingTomorrowBlock } from "@/lib/assistant/tomorrow-plan-types";
import type { Locale } from "@/lib/i18n/types";

type BlockKeyInput = {
  startTime: string;
  endTime: string;
  title: string;
};

export function getSuggestedBlockKey(block: BlockKeyInput): string {
  return `${block.startTime}-${block.endTime}-${block.title}`;
}

export function formatPlanTimeRange(
  startIso: string,
  endIso: string,
  locale: Locale,
  timeZone: string,
): string {
  const formatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  const start = formatter.format(new Date(startIso));
  const end = formatter.format(new Date(endIso));
  return `${start}–${end}`;
}

export function getAllSuggestedBlockKeys(
  blocks: readonly BlockKeyInput[],
): string[] {
  return blocks.map(getSuggestedBlockKey);
}

export function formatPlanBlockLine(
  block: BlockKeyInput,
  locale: Locale,
  timeZone: string,
): string {
  return `${formatPlanTimeRange(block.startTime, block.endTime, locale, timeZone)} · ${block.title}`;
}

export function mergeCreatedBlocksIntoExisting(
  existing: ExistingTomorrowBlock[],
  created: TomorrowPlanCreatedBlock[],
): ExistingTomorrowBlock[] {
  const merged = [
    ...existing,
    ...created.map((block) => ({
      id: block.id,
      title: block.title,
      categoryId: block.categoryId,
      categoryName: null,
      startTime: block.startTime,
      endTime: block.endTime,
    })),
  ];

  return merged.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

export function getTomorrowCalendarUrl(
  planDate: string,
  calendarUrl?: string | null,
): string {
  if (calendarUrl) return calendarUrl;
  return `/calendar?date=${encodeURIComponent(planDate)}`;
}
