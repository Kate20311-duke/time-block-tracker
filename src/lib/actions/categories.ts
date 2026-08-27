"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteCategoryForUser } from "@/lib/category-delete";
import { assertCategoryOwned } from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isNonEmptyTrimmed } from "@/lib/validation";

function revalidateAfterCategoryDelete(): void {
  revalidatePath("/categories");
  revalidatePath("/focus");
  revalidatePath("/dashboard");
  revalidatePath("/goals");
  revalidatePath("/routines");
  revalidatePath("/calendar");
  revalidatePath("/time-blocks");
  revalidatePath("/review/day");
  revalidatePath("/review/week");
  revalidatePath("/assistant");
}

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

  const result = await deleteCategoryForUser({
    userId: user.id,
    categoryId: id,
  });

  if (!result.ok) {
    if (result.error === "not_found") {
      return;
    }
    if (result.error === "has_time_blocks") {
      redirect("/categories?error=has-time-blocks");
    }
    redirect("/categories?error=delete_failed");
  }

  revalidateAfterCategoryDelete();
  redirect("/categories?success=deleted");
}
