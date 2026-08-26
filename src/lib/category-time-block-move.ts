import { assertCategoryOwned } from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import { prisma } from "@/lib/prisma";
import { sanitizeTimeBlockIds } from "@/lib/category-time-block-bulk";

export {
  MAX_BULK_TIME_BLOCKS,
  sanitizeTimeBlockIds,
} from "@/lib/category-time-block-bulk";

export type MoveTimeBlocksToCategoryInput = {
  timeBlockIds: readonly string[];
  targetCategoryId: string;
};

export type MoveTimeBlocksToCategorySuccess = {
  ok: true;
  movedCount: number;
  unchanged: boolean;
};

export type MoveTimeBlocksToCategoryFailure = {
  ok: false;
  error: "too_many" | "move_failed";
};

export type MoveTimeBlocksToCategoryResult =
  | MoveTimeBlocksToCategorySuccess
  | MoveTimeBlocksToCategoryFailure;

class BulkMoveAbortedError extends Error {
  readonly code = "aborted" as const;

  constructor() {
    super("Bulk move aborted");
    this.name = "BulkMoveAbortedError";
  }
}

function timeBlockUserScope(userId: string, uniqueIds: string[]) {
  return {
    id: { in: uniqueIds },
    category: { userId },
  };
}

export async function moveTimeBlocksToCategoryForUser(params: {
  userId: string;
  timeBlockIds: readonly string[];
  targetCategoryId: string;
}): Promise<MoveTimeBlocksToCategoryResult> {
  const sanitized = sanitizeTimeBlockIds(params.timeBlockIds);
  if (!sanitized.ok) {
    return sanitized;
  }

  if (sanitized.ids.length === 0) {
    return { ok: true, movedCount: 0, unchanged: true };
  }

  const targetCategoryId = params.targetCategoryId.trim();
  if (!targetCategoryId) {
    return { ok: false, error: "move_failed" };
  }

  try {
    await assertCategoryOwned(params.userId, targetCategoryId);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return { ok: false, error: "move_failed" };
    }
    throw error;
  }

  const uniqueIds = sanitized.ids;
  const ownedWhere = timeBlockUserScope(params.userId, uniqueIds);

  try {
    return await prisma.$transaction(async (tx) => {
      const ownedCount = await tx.timeBlock.count({ where: ownedWhere });
      if (ownedCount !== uniqueIds.length) {
        throw new BulkMoveAbortedError();
      }

      const alreadyInTarget = await tx.timeBlock.count({
        where: {
          ...ownedWhere,
          categoryId: targetCategoryId,
        },
      });
      if (alreadyInTarget === uniqueIds.length) {
        return { ok: true, movedCount: 0, unchanged: true };
      }

      const updated = await tx.timeBlock.updateMany({
        where: ownedWhere,
        data: { categoryId: targetCategoryId },
      });

      if (updated.count !== uniqueIds.length) {
        throw new BulkMoveAbortedError();
      }

      return { ok: true, movedCount: updated.count, unchanged: false };
    });
  } catch (error) {
    if (error instanceof BulkMoveAbortedError) {
      return { ok: false, error: "move_failed" };
    }
    throw error;
  }
}
