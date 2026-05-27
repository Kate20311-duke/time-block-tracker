"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isNonEmptyTrimmed } from "@/lib/validation";

function parseOptionalDescription(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function createCategory(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#3b82f6").trim();
  const description = parseOptionalDescription(formData.get("description"));

  if (!isNonEmptyTrimmed(name)) {
    redirect("/categories?error=empty_name");
  }

  await prisma.category.create({
    data: { name, color, description },
  });

  revalidatePath("/categories");
  revalidatePath("/calendar");
  redirect("/categories?success=created");
}

export async function updateCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#3b82f6").trim();
  const description = parseOptionalDescription(formData.get("description"));

  if (!id || !isNonEmptyTrimmed(name)) {
    return;
  }

  await prisma.category.update({
    where: { id },
    data: { name, color, description },
  });

  revalidatePath("/categories");
  revalidatePath("/calendar");
  redirect("/categories?success=updated");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  const timeBlockCount = await prisma.timeBlock.count({
    where: { categoryId: id },
  });

  if (timeBlockCount > 0) {
    redirect("/categories?error=has-time-blocks");
  }

  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    redirect("/categories?error=delete_failed");
  }

  revalidatePath("/categories");
  revalidatePath("/calendar");
  redirect("/categories?success=deleted");
}
