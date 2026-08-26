import type { Prisma } from "@/generated/prisma";
import {
  assertCategoryOwned,
  timeBlocksForUser,
} from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import type { Locale } from "@/lib/i18n/types";
import { durationMinutes, formatDurationMinutes } from "@/lib/time";

export const CATEGORY_TIME_BLOCK_LIST_TAKE = 20;

export type CategoryTimeBlockListItem = {
  id: string;
  title: string;
  dateLabel: string;
  timeRangeLabel: string;
  durationLabel: string;
};

export type CategoryTimeBlockCursor = {
  startTime: string;
  id: string;
};

export type CategoryTimeBlockCursorValue = {
  startTime: Date;
  id: string;
};

export type ListCategoryTimeBlocksSuccess = {
  ok: true;
  blocks: CategoryTimeBlockListItem[];
  hasMore: boolean;
  nextCursor: CategoryTimeBlockCursor | null;
};

export type ListCategoryTimeBlocksFailure = {
  ok: false;
  error: "not_found" | "load_failed";
};

export type ListCategoryTimeBlocksResult =
  | ListCategoryTimeBlocksSuccess
  | ListCategoryTimeBlocksFailure;

export type CategoryTimeBlockListQuery = {
  where: Prisma.TimeBlockWhereInput;
  orderBy: [{ startTime: "desc" }, { id: "desc" }];
  take: number;
  select: {
    id: true;
    title: true;
    startTime: true;
    endTime: true;
  };
};

const LIST_SELECT = {
  id: true,
  title: true,
  startTime: true,
  endTime: true,
} as const;

const LIST_ORDER_BY: CategoryTimeBlockListQuery["orderBy"] = [
  { startTime: "desc" },
  { id: "desc" },
];

/** Clamp a requested take to 1…CATEGORY_TIME_BLOCK_LIST_TAKE. */
export function resolveCategoryTimeBlockListTake(take?: number): number {
  if (take == null || !Number.isFinite(take) || take <= 0) {
    return CATEGORY_TIME_BLOCK_LIST_TAKE;
  }
  return Math.min(Math.floor(take), CATEGORY_TIME_BLOCK_LIST_TAKE);
}

export function parseCategoryTimeBlockCursor(
  raw: unknown,
):
  | { ok: true; cursor: CategoryTimeBlockCursorValue | null }
  | { ok: false } {
  if (raw == null || raw === "") {
    return { ok: true, cursor: null };
  }
  if (typeof raw !== "object") {
    return { ok: false };
  }

  const record = raw as { startTime?: unknown; id?: unknown };
  if (typeof record.startTime !== "string" || typeof record.id !== "string") {
    return { ok: false };
  }

  const id = record.id.trim();
  const startTime = new Date(record.startTime.trim());
  if (!id || Number.isNaN(startTime.getTime())) {
    return { ok: false };
  }

  return { ok: true, cursor: { startTime, id } };
}

export function toCategoryTimeBlockCursor(row: {
  startTime: Date;
  id: string;
}): CategoryTimeBlockCursor {
  return {
    startTime: row.startTime.toISOString(),
    id: row.id,
  };
}

/** Keyset: rows strictly after the cursor in startTime DESC, id DESC order. */
export function isCategoryTimeBlockAfterCursor(
  row: { startTime: Date; id: string },
  cursor: CategoryTimeBlockCursorValue,
): boolean {
  const rowTime = row.startTime.getTime();
  const cursorTime = cursor.startTime.getTime();
  if (rowTime < cursorTime) {
    return true;
  }
  if (rowTime > cursorTime) {
    return false;
  }
  return row.id < cursor.id;
}

export function sortCategoryTimeBlocksStable<
  T extends { startTime: Date; id: string },
>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const timeDiff = b.startTime.getTime() - a.startTime.getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    if (a.id === b.id) {
      return 0;
    }
    return a.id < b.id ? 1 : -1;
  });
}

export function buildCategoryTimeBlockKeysetWhere(
  categoryId: string,
  cursor?: CategoryTimeBlockCursorValue | null,
): Prisma.TimeBlockWhereInput {
  const scopedCategory = { categoryId };
  if (!cursor) {
    return scopedCategory;
  }

  return {
    AND: [
      scopedCategory,
      {
        OR: [
          { startTime: { lt: cursor.startTime } },
          {
            AND: [
              { startTime: cursor.startTime },
              { id: { lt: cursor.id } },
            ],
          },
        ],
      },
    ],
  };
}

/** Prisma options for a user-scoped category TimeBlock page (caller still uses timeBlocksForUser). */
export function buildCategoryTimeBlockListQuery(
  categoryId: string,
  take?: number,
  cursor?: CategoryTimeBlockCursorValue | null,
): CategoryTimeBlockListQuery {
  return {
    where: buildCategoryTimeBlockKeysetWhere(categoryId.trim(), cursor),
    orderBy: LIST_ORDER_BY,
    take: resolveCategoryTimeBlockListTake(take),
    select: LIST_SELECT,
  };
}

function localeTag(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}

export function formatCategoryTimeBlockDateLabel(
  date: Date,
  timeZone: string,
  locale: Locale,
): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeZone,
  }).format(date);
}

export function formatCategoryTimeBlockTimeLabel(
  date: Date,
  timeZone: string,
  locale: Locale,
): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function mapCategoryTimeBlockListItem(
  block: { id: string; title: string; startTime: Date; endTime: Date },
  timeZone: string,
  locale: Locale,
): CategoryTimeBlockListItem {
  const minutes = durationMinutes(block.startTime, block.endTime);
  const startLabel = formatCategoryTimeBlockTimeLabel(
    block.startTime,
    timeZone,
    locale,
  );
  const endLabel = formatCategoryTimeBlockTimeLabel(
    block.endTime,
    timeZone,
    locale,
  );

  return {
    id: block.id,
    title: block.title,
    dateLabel: formatCategoryTimeBlockDateLabel(
      block.startTime,
      timeZone,
      locale,
    ),
    timeRangeLabel: `${startLabel} – ${endLabel}`,
    durationLabel: formatDurationMinutes(minutes, locale),
  };
}

export async function loadCategoryTimeBlocksForUser(params: {
  userId: string;
  categoryId: string;
  userTimeZone: string;
  locale: Locale;
  cursor?: unknown;
}): Promise<ListCategoryTimeBlocksResult> {
  const categoryId = params.categoryId.trim();
  if (!categoryId) {
    return { ok: false, error: "not_found" };
  }

  const parsedCursor = parseCategoryTimeBlockCursor(params.cursor);
  if (!parsedCursor.ok) {
    return { ok: false, error: "load_failed" };
  }

  try {
    await assertCategoryOwned(params.userId, categoryId);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return { ok: false, error: "not_found" };
    }
    throw error;
  }

  const query = buildCategoryTimeBlockListQuery(
    categoryId,
    undefined,
    parsedCursor.cursor,
  );
  const rows = await timeBlocksForUser(params.userId, {
    ...query,
    take: query.take + 1,
  });
  const hasMore = rows.length > query.take;
  const page = rows.slice(0, query.take);
  const blocks = page.map((row) =>
    mapCategoryTimeBlockListItem(row, params.userTimeZone, params.locale),
  );
  const last = page.at(-1);
  const nextCursor =
    hasMore && last ? toCategoryTimeBlockCursor(last) : null;

  return { ok: true, blocks, hasMore, nextCursor };
}
