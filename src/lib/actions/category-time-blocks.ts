"use server";

import { revalidatePath } from "next/cache";
import {
  loadCategoryTimeBlocksForUser,
  type ListCategoryTimeBlocksResult,
} from "@/lib/category-time-blocks";
import {
  deleteTimeBlocksForUser,
  type DeleteTimeBlocksResult,
} from "@/lib/category-time-block-delete";
import {
  moveTimeBlocksToCategoryForUser,
  type MoveTimeBlocksToCategoryResult,
} from "@/lib/category-time-block-move";
import { getLocale } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

function revalidateAfterTimeBlockChange(): void {
  revalidatePath("/categories");
  revalidatePath("/calendar");
  revalidatePath("/time-blocks");
  revalidatePath("/dashboard");
  revalidatePath("/goals");
  revalidatePath("/review/day");
  revalidatePath("/review/week");
}

/**
 * Lazy-load the latest TimeBlocks for one owned category.
 * Returns a result object (no redirect) so a collapsed CategoryRow can fetch on expand.
 */
export async function listCategoryTimeBlocks(input: {
  categoryId: string;
  cursor?: unknown;
}): Promise<ListCategoryTimeBlocksResult> {
  try {
    const user = await requireUser();
    const [userTimeZone, locale] = await Promise.all([
      getUserCalendarTimeZone(),
      getLocale(),
    ]);

    return await loadCategoryTimeBlocksForUser({
      userId: user.id,
      categoryId: input.categoryId,
      cursor: input.cursor,
      userTimeZone,
      locale,
    });
  } catch {
    return { ok: false, error: "load_failed" };
  }
}

/** Move owned TimeBlocks to another owned category. All-or-nothing. */
export async function moveTimeBlocksToCategory(input: {
  timeBlockIds: string[];
  targetCategoryId: string;
}): Promise<MoveTimeBlocksToCategoryResult> {
  try {
    const user = await requireUser();
    const result = await moveTimeBlocksToCategoryForUser({
      userId: user.id,
      timeBlockIds: input.timeBlockIds,
      targetCategoryId: input.targetCategoryId,
    });
    if (result.ok && result.movedCount > 0) {
      revalidateAfterTimeBlockChange();
    }
    return result;
  } catch {
    return { ok: false, error: "move_failed" };
  }
}

/** Permanently delete owned TimeBlocks. All-or-nothing. Does not delete FocusSessions. */
export async function deleteTimeBlocksBulk(input: {
  timeBlockIds: string[];
}): Promise<DeleteTimeBlocksResult> {
  try {
    const user = await requireUser();
    const result = await deleteTimeBlocksForUser({
      userId: user.id,
      timeBlockIds: input.timeBlockIds,
    });
    if (result.ok && result.deletedCount > 0) {
      revalidateAfterTimeBlockChange();
    }
    return result;
  } catch {
    return { ok: false, error: "delete_failed" };
  }
}
