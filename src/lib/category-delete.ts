import { assertCategoryOwned } from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import { timeBlockScopeWhere } from "@/lib/db/scoped-where";
import { prisma } from "@/lib/prisma";

export type DeleteCategoryError =
  | "has_time_blocks"
  | "delete_failed"
  | "not_found";

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; error: DeleteCategoryError };

/**
 * Category delete eligibility depends only on TimeBlock existence.
 * FocusSession / FocusSegment are preserved (DB ON DELETE SET NULL).
 */
export async function deleteCategoryForUser(params: {
  userId: string;
  categoryId: string;
}): Promise<DeleteCategoryResult> {
  const categoryId = params.categoryId.trim();
  if (!categoryId) {
    return { ok: false, error: "not_found" };
  }

  try {
    await assertCategoryOwned(params.userId, categoryId);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return { ok: false, error: "not_found" };
    }
    throw error;
  }

  const timeBlockCount = await prisma.timeBlock.count({
    where: timeBlockScopeWhere(params.userId, { categoryId }),
  });
  if (timeBlockCount > 0) {
    return { ok: false, error: "has_time_blocks" };
  }

  try {
    const deleted = await prisma.category.deleteMany({
      where: { id: categoryId, userId: params.userId },
    });
    if (deleted.count === 0) {
      return { ok: false, error: "not_found" };
    }
  } catch {
    return { ok: false, error: "delete_failed" };
  }

  return { ok: true };
}
