"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCategoryOwned } from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import {
  FOCUS_SESSION_CATEGORY_BLOCKING_STATUSES,
} from "@/lib/focus-session-status";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isNonEmptyTrimmed } from "@/lib/validation";

function parseOptionalDescription(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function createCategory(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#3b82f6").trim();
  const description = parseOptionalDescription(formData.get("description"));

  if (!isNonEmptyTrimmed(name)) {
    redirect("/categories?error=empty_name");
  }

  await prisma.category.create({
    data: { name, color, description, userId: user.id },
  });

  revalidatePath("/categories");
  revalidatePath("/calendar");
  redirect("/categories?success=created");
}

export async function updateCategory(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#3b82f6").trim();
  const description = parseOptionalDescription(formData.get("description"));

  if (!id || !isNonEmptyTrimmed(name)) {
    return;
  }

  try {
    await assertCategoryOwned(user.id, id);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return;
    }
    throw error;
  }

  await prisma.category.updateMany({
    where: { id, userId: user.id },
    data: { name, color, description },
  });

  revalidatePath("/categories");
  revalidatePath("/calendar");
  redirect("/categories?success=updated");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  try {
    await assertCategoryOwned(user.id, id);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return;
    }
    throw error;
  }

  const categoryScope = { categoryId: id, category: { userId: user.id } };

  const [timeBlockCount, activeFocusCount, remainingFocusCount] =
    await Promise.all([
      prisma.timeBlock.count({ where: categoryScope }),
      prisma.focusSession.count({
        where: { ...categoryScope, status: { in: ["running", "planned"] } },
      }),
      prisma.focusSession.count({
        where: {
          ...categoryScope,
          status: { in: [...FOCUS_SESSION_CATEGORY_BLOCKING_STATUSES] },
        },
      }),
    ]);

  if (timeBlockCount > 0) {
    redirect(
      `/categories?error=has-time-blocks&timeBlocks=${timeBlockCount}&activeFocus=${activeFocusCount}&blockingFocus=${remainingFocusCount}`,
    );
  }

  if (activeFocusCount > 0) {
    redirect(
      `/categories?error=has-active-focus&timeBlocks=0&activeFocus=${activeFocusCount}&blockingFocus=${remainingFocusCount}`,
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.focusSession.deleteMany({
        where: { ...categoryScope, status: "abandoned" },
      });

      const remainingFocus = await tx.focusSession.count({
        where: categoryScope,
      });

      if (remainingFocus > 0) {
        throw new Error("HAS_REMAINING_FOCUS");
      }

      await tx.category.delete({ where: { id, userId: user.id } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "HAS_REMAINING_FOCUS") {
      redirect(
        `/categories?error=has-completed-focus&timeBlocks=0&activeFocus=0&blockingFocus=${remainingFocusCount}`,
      );
    }
    redirect("/categories?error=delete_failed");
  }

  revalidatePath("/categories");
  revalidatePath("/calendar");
  redirect("/categories?success=deleted");
}
