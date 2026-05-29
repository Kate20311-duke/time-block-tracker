"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCategoryOwned } from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
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

  const [timeBlockCount, focusSessionCount] = await Promise.all([
    prisma.timeBlock.count({
      where: { categoryId: id, category: { userId: user.id } },
    }),
    prisma.focusSession.count({
      where: { categoryId: id, category: { userId: user.id } },
    }),
  ]);

  if (timeBlockCount > 0 || focusSessionCount > 0) {
    redirect("/categories?error=has-records");
  }

  try {
    await prisma.category.delete({ where: { id, userId: user.id } });
  } catch {
    redirect("/categories?error=delete_failed");
  }

  revalidatePath("/categories");
  revalidatePath("/calendar");
  redirect("/categories?success=deleted");
}
