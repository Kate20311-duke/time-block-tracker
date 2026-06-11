import "server-only";

import { addCalendarDays, startOfDay } from "@/lib/calendar";
import { getDayBoundsForDateParam } from "@/lib/calendar-timezone";
import {
  buildTomorrowRoutineBlocks,
  type RoutineRecordForTomorrowPlan,
} from "@/lib/assistant/tomorrow-plan-routines";
import type { TomorrowPlanContext } from "@/lib/assistant/tomorrow-plan-types";
import { formatDateParamInTimeZone } from "@/lib/assistant/time-review-range";
import {
  categoriesForUser,
  timeBlocksForUser,
} from "@/lib/db/scoped";
import { prisma } from "@/lib/prisma";
import {
  clipTimeBlockToWindow,
  totalMinutesByCategory,
  type TimeBlockLike,
} from "@/lib/stats";

const RECENT_USAGE_DAYS = 30;

export function getTomorrowDateParam(
  timeZone: string,
  now: Date = new Date(),
): string {
  const tomorrow = addCalendarDays(startOfDay(now, timeZone), 1, timeZone);
  return formatDateParamInTimeZone(tomorrow, timeZone);
}

export async function getTomorrowRoutineBlocks(
  userId: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<TomorrowPlanContext["routineBlocks"]> {
  const tomorrowDate = getTomorrowDateParam(timeZone, now);
  const routines = await prisma.routine.findMany({
    where: { userId, isActive: true },
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return buildTomorrowRoutineBlocks({
    date: tomorrowDate,
    timeZone,
    routines: routines as RoutineRecordForTomorrowPlan[],
  });
}

export async function getTomorrowPlanContext(
  userId: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<TomorrowPlanContext> {
  const tomorrowDate = getTomorrowDateParam(timeZone, now);
  const { dayStart, dayEnd } = getDayBoundsForDateParam(tomorrowDate, timeZone);

  const recentStart = addCalendarDays(
    startOfDay(now, timeZone),
    -(RECENT_USAGE_DAYS - 1),
    timeZone,
  );

  const [categories, tomorrowBlocks, recentBlocks, activeRoutines] =
    await Promise.all([
    categoriesForUser(userId, { orderBy: { name: "asc" } }),
    timeBlocksForUser(userId, {
      where: {
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      include: { category: true },
      orderBy: { startTime: "asc" },
    }),
    timeBlocksForUser(userId, {
      where: {
        startTime: { lt: now },
        endTime: { gt: recentStart },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.routine.findMany({
      where: { userId, isActive: true },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const existingBlocks = tomorrowBlocks.map((block) => ({
    id: block.id,
    title: block.title,
    categoryId: block.categoryId,
    categoryName: block.category?.name ?? null,
    startTime: block.startTime.toISOString(),
    endTime: block.endTime.toISOString(),
  }));

  const recentLite: TimeBlockLike[] = recentBlocks.map((block) => ({
    startTime: block.startTime,
    endTime: block.endTime,
    categoryId: block.categoryId,
    status: block.status,
  }));

  const recentInRange = recentLite
    .map((block) => clipTimeBlockToWindow(block, recentStart, now))
    .filter((block): block is TimeBlockLike => block !== null);

  const categoryMinutes = totalMinutesByCategory(recentInRange, categories);
  const recentCategoryUsage = categoryMinutes
    .filter((row) => row.totalMinutes > 0)
    .map((row) => ({
      categoryId: row.categoryId,
      name: row.categoryName ?? row.categoryId,
      minutes: row.totalMinutes,
    }));

  const recentById = new Map(
    recentCategoryUsage.map((row) => [row.categoryId, row.minutes]),
  );

  const routineBlocks = buildTomorrowRoutineBlocks({
    date: tomorrowDate,
    timeZone,
    routines: activeRoutines as RoutineRecordForTomorrowPlan[],
  });

  return {
    date: tomorrowDate,
    timezone: timeZone,
    existingBlocks,
    routineBlocks,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      recentMinutes: recentById.get(category.id) ?? 0,
    })),
    recentCategoryUsage,
  };
}
