import "server-only";

import { revalidatePath } from "next/cache";

import { timeBlocksForUser } from "@/lib/db/scoped";
import { prisma } from "@/lib/prisma";
import {
  expandRoutineOccurrences,
  processRoutineCandidate,
  toInterval,
  type ExistingTimeBlock,
  type TimeInterval,
} from "@/lib/routines/routine-generate";
import { validateGenerateDateRange } from "@/lib/routines/routine-generate-range";
import type {
  RoutineGenerateCreatedBlock,
  RoutineGenerateInput,
  RoutineGenerateResult,
  RoutineGenerateSkippedBlock,
} from "@/lib/routines/routine-generate-types";
import { MAX_ROUTINE_IDS } from "@/lib/routines/routine-generate-types";
import { getDayQueryRange } from "@/lib/calendar";

export class RoutineGenerateError extends Error {
  constructor(
    readonly code:
      | "invalid_date"
      | "invalid_range"
      | "range_too_long"
      | "no_active_routines"
      | "invalid_routine_ids",
  ) {
    super(code);
  }
}

export async function generateRoutineTimeBlocks(params: {
  userId: string;
  timeZone: string;
  input: RoutineGenerateInput;
}): Promise<RoutineGenerateResult> {
  const rangeError = validateGenerateDateRange(
    params.input.startDate,
    params.input.endDate,
  );
  if (rangeError) {
    throw new RoutineGenerateError(rangeError);
  }

  const routineIds = params.input.routineIds?.map((id) => id.trim()).filter(Boolean);
  if (routineIds && routineIds.length > MAX_ROUTINE_IDS) {
    throw new RoutineGenerateError("invalid_range");
  }

  if (routineIds && routineIds.length > 0) {
    const ownedCount = await prisma.routine.count({
      where: {
        userId: params.userId,
        isActive: true,
        id: { in: routineIds },
      },
    });
    if (ownedCount !== routineIds.length) {
      throw new RoutineGenerateError("invalid_routine_ids");
    }
  }

  const routineWhere = {
    userId: params.userId,
    isActive: true,
    ...(routineIds && routineIds.length > 0 ? { id: { in: routineIds } } : {}),
  };

  const [routines, categories, rangeStart, rangeEnd] = await Promise.all([
    prisma.routine.findMany({
      where: routineWhere,
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: params.userId },
      select: { id: true },
    }),
    Promise.resolve(getDayQueryRange(params.input.startDate, params.timeZone).dayStart),
    Promise.resolve(getDayQueryRange(params.input.endDate, params.timeZone).dayEnd),
  ]);

  if (routines.length === 0) {
    throw new RoutineGenerateError("no_active_routines");
  }

  if (routineIds && routineIds.length > 0 && routines.length !== routineIds.length) {
    throw new RoutineGenerateError("invalid_routine_ids");
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  const calendarUrl = `/calendar?date=${encodeURIComponent(params.input.startDate)}`;

  const existingBlocks: ExistingTimeBlock[] = await timeBlocksForUser(params.userId, {
    where: {
      startTime: { lt: rangeEnd },
      endTime: { gt: rangeStart },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
    },
    orderBy: { startTime: "asc" },
  });

  const existingIntervals: TimeInterval[] = existingBlocks
    .map((block) => toInterval(block.startTime, block.endTime))
    .filter((interval): interval is TimeInterval => interval !== null);

  const candidates = expandRoutineOccurrences({
    routines,
    startDate: params.input.startDate,
    endDate: params.input.endDate,
    timeZone: params.timeZone,
  });

  const createdBlocks: RoutineGenerateCreatedBlock[] = [];
  const skippedBlocks: RoutineGenerateSkippedBlock[] = [];
  const batchIntervals: TimeInterval[] = [];

  for (const candidate of candidates) {
    const result = processRoutineCandidate({
      candidate,
      categoryIds,
      existingBlocks,
      existingIntervals,
      batchIntervals,
    });

    if (result.action === "skip") {
      skippedBlocks.push(result.skipped);
      continue;
    }

    try {
      const created = await prisma.timeBlock.create({
        data: {
          title: candidate.title,
          categoryId: candidate.categoryId!,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          note: candidate.note,
          status: "planned",
          completionLevel: 0,
          source: "manual",
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      });

      const interval = toInterval(created.startTime, created.endTime);
      if (interval) {
        existingIntervals.push(interval);
        batchIntervals.push(interval);
      }

      existingBlocks.push({
        id: created.id,
        title: created.title,
        startTime: created.startTime,
        endTime: created.endTime,
      });

      createdBlocks.push({
        id: created.id,
        title: created.title,
        routineId: candidate.routineId,
        startTime: created.startTime.toISOString(),
        endTime: created.endTime.toISOString(),
      });
    } catch {
      skippedBlocks.push({
        title: candidate.title,
        routineId: candidate.routineId,
        date: candidate.date,
        startTime: candidate.startTime.toISOString(),
        endTime: candidate.endTime.toISOString(),
        reason: "invalid_category",
      });
    }
  }

  if (createdBlocks.length > 0) {
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    revalidatePath("/time-blocks");
    revalidatePath("/review/day");
    revalidatePath("/review/week");
    revalidatePath("/routines");
  }

  return {
    createdCount: createdBlocks.length,
    skippedCount: skippedBlocks.length,
    createdBlocks,
    skippedBlocks,
    calendarUrl,
  };
}
