import { getDayBoundsForDateParam } from "@/lib/calendar-timezone";
import {
  getBusyTimeIntervals,
  intervalsOverlap,
  toTimeInterval,
  type TimeInterval,
} from "@/lib/assistant/tomorrow-plan-busy";
import type {
  TomorrowPlanBlockDraft,
  TomorrowPlanContext,
  TomorrowPlanResult,
} from "@/lib/assistant/tomorrow-plan-types";
import {
  PLAN_BLOCK_MAX_COUNT,
  PLAN_BLOCK_MIN_COUNT,
  PLAN_BLOCK_MIN_MINUTES,
} from "@/lib/assistant/tomorrow-plan-types";
import type { Locale } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n";

const WINDOW_START_MINUTES = 9 * 60;
const WINDOW_END_MINUTES = 21 * 60;
const DEFAULT_BLOCK_MINUTES = 60;
const GAP_MINUTES = 30;

type Interval = TimeInterval;

function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}

function findFreeSlots(
  dayStart: Date,
  busy: Interval[],
  minMinutes: number,
): { start: Date; end: Date }[] {
  const windowStart = addMinutes(dayStart, WINDOW_START_MINUTES);
  const windowEnd = addMinutes(dayStart, WINDOW_END_MINUTES);
  const sorted = [...busy].sort((a, b) => a.startMs - b.startMs);

  const slots: { start: Date; end: Date }[] = [];
  let cursor = windowStart.getTime();

  for (const block of sorted) {
    const blockStart = Math.max(block.startMs, windowStart.getTime());
    const blockEnd = Math.min(block.endMs, windowEnd.getTime());
    if (blockEnd <= windowStart.getTime() || blockStart >= windowEnd.getTime()) {
      continue;
    }
    if (blockStart - cursor >= minMinutes * 60_000) {
      slots.push({
        start: new Date(cursor),
        end: new Date(blockStart),
      });
    }
    cursor = Math.max(cursor, blockEnd);
  }

  if (windowEnd.getTime() - cursor >= minMinutes * 60_000) {
    slots.push({ start: new Date(cursor), end: windowEnd });
  }

  return slots;
}

function pickCategory(
  context: TomorrowPlanContext,
  userGoal: string,
): { id: string | null; name: string | null } {
  if (context.categories.length === 0) {
    return { id: null, name: null };
  }

  const goalLower = userGoal.toLowerCase();
  const matched = context.categories.find((category) =>
    userGoal.includes(category.name) ||
    goalLower.includes(category.name.toLowerCase()),
  );
  if (matched) {
    return { id: matched.id, name: matched.name };
  }

  const topRecent = [...context.categories].sort(
    (a, b) => (b.recentMinutes ?? 0) - (a.recentMinutes ?? 0),
  )[0];
  return { id: topRecent.id, name: topRecent.name };
}

function extractTaskTitle(userGoal: string, locale: Locale): string {
  const trimmed = userGoal.trim();
  if (trimmed.length <= 24) return trimmed;
  if (locale === "zh") return `${trimmed.slice(0, 20)}…`;
  return `${trimmed.slice(0, 24)}…`;
}

function getAllBusyIntervals(context: TomorrowPlanContext): Interval[] {
  return getBusyTimeIntervals([
    ...context.existingBlocks.map((block) => ({
      startTime: block.startTime,
      endTime: block.endTime,
    })),
    ...context.routineBlocks.map((block) => ({
      startTime: block.startTime,
      endTime: block.endTime,
    })),
  ]);
}

export function generateMockTomorrowPlan(params: {
  userGoal: string;
  context: TomorrowPlanContext;
  locale?: Locale;
}): TomorrowPlanResult {
  const locale = params.locale ?? "zh";
  const labels = getDictionary(locale).assistant;
  const { userGoal, context } = params;
  const { dayStart } = getDayBoundsForDateParam(context.date, context.timezone);

  const busy = getAllBusyIntervals(context);
  const slots = findFreeSlots(dayStart, busy, PLAN_BLOCK_MIN_MINUTES);
  const category = pickCategory(context, userGoal);
  const taskTitle = extractTaskTitle(userGoal, locale);

  const warnings: string[] = [];
  const totalBusyCount =
    context.existingBlocks.length + context.routineBlocks.length;

  if (totalBusyCount >= 4) {
    warnings.push(labels.tomorrowPlanMockBusyDay);
  }
  if (context.routineBlocks.length >= 2) {
    warnings.push(labels.tomorrowPlanMockRoutineHeavyDay);
  }

  const suggestedBlocks: TomorrowPlanBlockDraft[] = [];
  const usedIntervals: Interval[] = [...busy];

  const targetCount = Math.min(
    PLAN_BLOCK_MAX_COUNT,
    Math.max(PLAN_BLOCK_MIN_COUNT, slots.length > 0 ? 3 : 1),
  );

  for (const slot of slots) {
    if (suggestedBlocks.length >= targetCount) break;

    const slotMinutes = Math.round(
      (slot.end.getTime() - slot.start.getTime()) / 60_000,
    );
    if (slotMinutes < PLAN_BLOCK_MIN_MINUTES) continue;

    const blockMinutes = Math.min(
      DEFAULT_BLOCK_MINUTES,
      slotMinutes - GAP_MINUTES,
    );
    if (blockMinutes < PLAN_BLOCK_MIN_MINUTES) continue;

    const start = addMinutes(slot.start, Math.min(15, Math.max(0, slotMinutes - blockMinutes - 15)));
    const end = addMinutes(start, blockMinutes);
    const interval = toTimeInterval(start.toISOString(), end.toISOString());
    if (!interval) continue;

    const overlaps = usedIntervals.some((existing) =>
      intervalsOverlap(interval, existing),
    );
    if (overlaps) continue;

    suggestedBlocks.push({
      title:
        suggestedBlocks.length === 0
          ? taskTitle
          : `${taskTitle}（${suggestedBlocks.length + 1}）`,
      categoryId: category.id,
      categoryName: category.name,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      reason:
        suggestedBlocks.length === 0
          ? labels.tomorrowPlanMockReasonPrimary
          : labels.tomorrowPlanMockReasonFollowUp,
      confidence: totalBusyCount > 0 ? "medium" : "high",
    });
    usedIntervals.push(interval);
  }

  if (suggestedBlocks.length === 0 && slots.length > 0) {
    const slot = slots[0];
    const start = slot.start;
    const end = addMinutes(start, PLAN_BLOCK_MIN_MINUTES);
    const interval = toTimeInterval(start.toISOString(), end.toISOString());
    if (interval && !usedIntervals.some((existing) => intervalsOverlap(interval, existing))) {
      suggestedBlocks.push({
        title: taskTitle,
        categoryId: category.id,
        categoryName: category.name,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        reason: labels.tomorrowPlanMockReasonLight,
        confidence: "low",
      });
      warnings.push(labels.tomorrowPlanMockBusyDay);
    }
  }

  if (suggestedBlocks.length === 0) {
    warnings.push(labels.tomorrowPlanMockNoSlots);
  }

  return {
    date: context.date,
    summary: labels.tomorrowPlanMockSummary,
    assumptions: [labels.tomorrowPlanMockAssumption],
    suggestedBlocks,
    warnings,
  };
}
