import { sanitizeTimeBlockIds } from "@/lib/category-time-block-bulk";
import { prisma } from "@/lib/prisma";

export type DeleteTimeBlocksSuccess = {
  ok: true;
  deletedCount: number;
  unchanged: boolean;
};

export type DeleteTimeBlocksFailure = {
  ok: false;
  error: "too_many" | "delete_failed";
};

export type DeleteTimeBlocksResult =
  | DeleteTimeBlocksSuccess
  | DeleteTimeBlocksFailure;

class BulkDeleteAbortedError extends Error {
  readonly code = "aborted" as const;

  constructor() {
    super("Bulk delete aborted");
    this.name = "BulkDeleteAbortedError";
  }
}

function timeBlockUserScope(userId: string, uniqueIds: string[]) {
  return {
    id: { in: uniqueIds },
    category: { userId },
  };
}

export async function deleteTimeBlocksForUser(params: {
  userId: string;
  timeBlockIds: readonly string[];
}): Promise<DeleteTimeBlocksResult> {
  const sanitized = sanitizeTimeBlockIds(params.timeBlockIds);
  if (!sanitized.ok) {
    return { ok: false, error: "too_many" };
  }

  if (sanitized.ids.length === 0) {
    return { ok: true, deletedCount: 0, unchanged: true };
  }

  const uniqueIds = sanitized.ids;
  const ownedWhere = timeBlockUserScope(params.userId, uniqueIds);

  try {
    return await prisma.$transaction(async (tx) => {
      const ownedCount = await tx.timeBlock.count({ where: ownedWhere });
      if (ownedCount !== uniqueIds.length) {
        throw new BulkDeleteAbortedError();
      }

      const deleted = await tx.timeBlock.deleteMany({
        where: ownedWhere,
      });

      if (deleted.count !== uniqueIds.length) {
        throw new BulkDeleteAbortedError();
      }

      return { ok: true, deletedCount: deleted.count, unchanged: false };
    });
  } catch {
    return { ok: false, error: "delete_failed" };
  }
}
