import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { durationMinutes } from "@/lib/time";

export type CategoryDurationRow = {
  categoryId: string;
  minutes: unknown;
};

/** Full TimeBlock duration (end − start), not dashboard/goal day-clipping. */
export function timeBlockDurationMinutes(
  startTime: Date,
  endTime: Date,
): number {
  return durationMinutes(startTime, endTime);
}

export function totalTimeBlockDurationMinutes(
  blocks: readonly { startTime: Date; endTime: Date }[],
): number {
  return blocks.reduce(
    (sum, block) => sum + timeBlockDurationMinutes(block.startTime, block.endTime),
    0,
  );
}

export function parseDurationMinutesValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "bigint") {
    return Math.max(0, Number(value));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }
  return 0;
}

export function durationMinutesByCategoryId(
  categoryIds: readonly string[],
  rows: readonly CategoryDurationRow[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const id of categoryIds) {
    const trimmed = id.trim();
    if (trimmed) {
      totals.set(trimmed, 0);
    }
  }
  for (const row of rows) {
    const categoryId = String(row.categoryId ?? "").trim();
    if (!categoryId || !totals.has(categoryId)) {
      continue;
    }
    totals.set(categoryId, parseDurationMinutesValue(row.minutes));
  }
  return totals;
}

export function buildCategoryDurationSummarySql(
  userId: string,
  categoryIds: readonly string[],
): Prisma.Sql {
  return Prisma.sql`
    SELECT
      tb."categoryId" AS "categoryId",
      COALESCE(
        SUM(
          GREATEST(
            0,
            ROUND(EXTRACT(EPOCH FROM (tb."endTime" - tb."startTime")) / 60.0)
          )
        ),
        0
      ) AS minutes
    FROM "app"."TimeBlock" tb
    INNER JOIN "app"."Category" c ON c."id" = tb."categoryId"
    WHERE c."userId" = ${userId}
      AND tb."categoryId" IN (${Prisma.join(categoryIds)})
    GROUP BY tb."categoryId"
  `;
}

/** One DB aggregate for the current user's categories. Does not load TimeBlock rows. */
export async function loadCategoryTimeBlockDurationMinutesByCategoryId(
  userId: string,
  categoryIds: readonly string[],
): Promise<Map<string, number>> {
  const uniqueIds = [...new Set(categoryIds.map((id) => id.trim()).filter(Boolean))];
  if (!userId.trim() || uniqueIds.length === 0) {
    return durationMinutesByCategoryId(uniqueIds, []);
  }

  const rows = await prisma.$queryRaw<CategoryDurationRow[]>(
    buildCategoryDurationSummarySql(userId, uniqueIds),
  );
  return durationMinutesByCategoryId(uniqueIds, rows);
}
