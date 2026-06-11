import "server-only";

import { revalidatePath } from "next/cache";

import { getTomorrowDateParam, getTomorrowRoutineBlocks } from "@/lib/assistant/tomorrow-plan-context";
import type {
  TomorrowPlanApplyInputBlock,
  TomorrowPlanApplyResult,
  TomorrowPlanCreatedBlock,
  TomorrowPlanSkipReason,
  TomorrowPlanSkippedBlock,
} from "@/lib/assistant/tomorrow-plan-apply-types";
import {
  APPLY_MAX_MINUTES,
  APPLY_MIN_MINUTES,
  APPLY_TITLE_MAX_LENGTH,
  MAX_APPLY_BLOCKS,
} from "@/lib/assistant/tomorrow-plan-apply-types";
import { getDayBoundsForDateParam } from "@/lib/calendar-timezone";
import { categoriesForUser, timeBlocksForUser } from "@/lib/db/scoped";
import { prisma } from "@/lib/prisma";

type Interval = { startMs: number; endMs: number };

function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

function toInterval(start: Date, end: Date): Interval | null {
  if (end.getTime() <= start.getTime()) return null;
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function normalizeInput(
  block: TomorrowPlanApplyInputBlock,
): {
  title: string;
  categoryId: string | null;
  start: Date;
  end: Date;
} | null {
  const title = String(block.title ?? "").trim().slice(0, APPLY_TITLE_MAX_LENGTH);
  if (!title) return null;

  const start = new Date(block.startTime);
  const end = new Date(block.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  if (end.getTime() <= start.getTime()) return null;

  const categoryId =
    typeof block.categoryId === "string" && block.categoryId.trim()
      ? block.categoryId.trim()
      : null;

  return { title, categoryId, start, end };
}

function skip(
  skipped: TomorrowPlanSkippedBlock[],
  title: string,
  reason: TomorrowPlanSkipReason,
  startTime?: string,
  endTime?: string,
): void {
  skipped.push({ title, reason, startTime, endTime });
}

export async function applyTomorrowPlanBlocks(params: {
  userId: string;
  timeZone: string;
  blocks: TomorrowPlanApplyInputBlock[];
}): Promise<TomorrowPlanApplyResult> {
  const tomorrowDate = getTomorrowDateParam(params.timeZone);
  const { dayStart, dayEnd } = getDayBoundsForDateParam(
    tomorrowDate,
    params.timeZone,
  );
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();
  const calendarUrl = `/calendar?date=${encodeURIComponent(tomorrowDate)}`;

  const [categories, existingBlocks, routineBlocks] = await Promise.all([
    categoriesForUser(params.userId, { select: { id: true } }),
    timeBlocksForUser(params.userId, {
      where: {
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: "asc" },
    }),
    getTomorrowRoutineBlocks(params.userId, params.timeZone),
  ]);

  const categoryIds = new Set(categories.map((category) => category.id));
  const existingIntervals: Interval[] = existingBlocks
    .map((block) => toInterval(block.startTime, block.endTime))
    .filter((interval): interval is Interval => interval !== null);

  const routineIntervals: Interval[] = routineBlocks
    .map((block) => toInterval(new Date(block.startTime), new Date(block.endTime)))
    .filter((interval): interval is Interval => interval !== null);

  const createdBlocks: TomorrowPlanCreatedBlock[] = [];
  const skippedBlocks: TomorrowPlanSkippedBlock[] = [];
  const batchIntervals: Interval[] = [];

  const inputBlocks = params.blocks.slice(0, MAX_APPLY_BLOCKS);

  for (const raw of inputBlocks) {
    const normalized = normalizeInput(raw);
    if (!normalized) {
      skip(
        skippedBlocks,
        String(raw.title ?? "").trim() || "—",
        "invalid_fields",
        raw.startTime,
        raw.endTime,
      );
      continue;
    }

    const { title, categoryId, start, end } = normalized;
    const startMs = start.getTime();
    const endMs = end.getTime();

    if (startMs < dayStartMs || endMs > dayEndMs) {
      skip(
        skippedBlocks,
        title,
        "not_tomorrow",
        start.toISOString(),
        end.toISOString(),
      );
      continue;
    }

    const minutes = durationMinutes(start, end);
    if (minutes < APPLY_MIN_MINUTES || minutes > APPLY_MAX_MINUTES) {
      skip(
        skippedBlocks,
        title,
        "invalid_duration",
        start.toISOString(),
        end.toISOString(),
      );
      continue;
    }

    if (!categoryId || !categoryIds.has(categoryId)) {
      skip(
        skippedBlocks,
        title,
        "invalid_category",
        start.toISOString(),
        end.toISOString(),
      );
      continue;
    }

    const interval = toInterval(start, end);
    if (!interval) {
      skip(skippedBlocks, title, "invalid_fields", start.toISOString(), end.toISOString());
      continue;
    }

    const duplicate = existingBlocks.some(
      (block) =>
        block.title === title &&
        block.startTime.getTime() === startMs &&
        block.endTime.getTime() === endMs,
    );
    if (duplicate) {
      skip(
        skippedBlocks,
        title,
        "duplicate",
        start.toISOString(),
        end.toISOString(),
      );
      continue;
    }

    const conflictsExisting = existingIntervals.some((existing) =>
      intervalsOverlap(interval, existing),
    );
    if (conflictsExisting) {
      skip(
        skippedBlocks,
        title,
        "conflict_existing",
        start.toISOString(),
        end.toISOString(),
      );
      continue;
    }

    const conflictsRoutine = routineIntervals.some((routineInterval) =>
      intervalsOverlap(interval, routineInterval),
    );
    if (conflictsRoutine) {
      skip(
        skippedBlocks,
        title,
        "conflict_routine",
        start.toISOString(),
        end.toISOString(),
      );
      continue;
    }

    const conflictsBatch = batchIntervals.some((accepted) =>
      intervalsOverlap(interval, accepted),
    );
    if (conflictsBatch) {
      skip(
        skippedBlocks,
        title,
        "conflict_batch",
        start.toISOString(),
        end.toISOString(),
      );
      continue;
    }

    try {
      const created = await prisma.timeBlock.create({
        data: {
          title,
          categoryId,
          startTime: start,
          endTime: end,
          status: "planned",
          completionLevel: 0,
          source: "manual",
        },
        select: {
          id: true,
          title: true,
          categoryId: true,
          startTime: true,
          endTime: true,
        },
      });

      createdBlocks.push({
        id: created.id,
        title: created.title,
        categoryId: created.categoryId,
        startTime: created.startTime.toISOString(),
        endTime: created.endTime.toISOString(),
      });

      existingIntervals.push(interval);
      batchIntervals.push(interval);
      existingBlocks.push({
        id: created.id,
        title: created.title,
        startTime: created.startTime,
        endTime: created.endTime,
      });
    } catch {
      skip(
        skippedBlocks,
        title,
        "invalid_fields",
        start.toISOString(),
        end.toISOString(),
      );
    }
  }

  if (createdBlocks.length > 0) {
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    revalidatePath("/time-blocks");
    revalidatePath("/review/day");
    revalidatePath("/review/week");
    revalidatePath("/assistant");
  }

  return {
    createdCount: createdBlocks.length,
    skippedCount: skippedBlocks.length,
    createdBlocks,
    skippedBlocks,
    calendarUrl,
  };
}
