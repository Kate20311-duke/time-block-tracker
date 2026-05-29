"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildFullTimeBlockUpdateData,
  parseTimeBlockFormData,
  validateFullTimeBlockForm,
} from "@/lib/actions/time-block-shared";
import {
  assertCategoryOwned,
  assertTimeBlockOwned,
} from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { clampCompletionLevel } from "@/lib/validation";

function redirectOnValidationError(error: string): void {
  redirect(`/time-blocks?error=${error}`);
}

export async function createTimeBlock(formData: FormData): Promise<void> {
  const user = await requireUser();
  const data = parseTimeBlockFormData(formData);

  const { error, range } = validateFullTimeBlockForm(data);

  if (error) {
    redirectOnValidationError(error);
  }

  if (!range) {
    redirect("/time-blocks?error=invalid_range");
  }

  try {
    await assertCategoryOwned(user.id, data.categoryId);
  } catch (error) {
    if (isScopedAccessError(error)) {
      redirect("/time-blocks?error=missing_fields");
    }
    throw error;
  }

  await prisma.timeBlock.create({
    data: {
      title: data.title,
      note: data.note,
      reviewNote: data.reviewNote,
      categoryId: data.categoryId,
      status: data.status,
      completionLevel: clampCompletionLevel(data.completionLevel),
      efficiencyLevel: data.efficiencyLevel,
      startTime: range.start,
      endTime: range.end,
    },
  });

  revalidatePath("/time-blocks");
  revalidatePath("/calendar");
  redirect("/time-blocks?success=created");
}

export async function updateTimeBlock(formData: FormData): Promise<void> {
  const user = await requireUser();
  const data = parseTimeBlockFormData(formData);

  if (!data.id) {
    redirect("/time-blocks?error=missing_fields");
  }

  const { error, range } = validateFullTimeBlockForm(data);

  if (error) {
    redirectOnValidationError(error);
  }

  if (!range) {
    redirect("/time-blocks?error=invalid_range");
  }

  try {
    await assertTimeBlockOwned(user.id, data.id);
    await assertCategoryOwned(user.id, data.categoryId);
  } catch (scopedError) {
    if (isScopedAccessError(scopedError)) {
      redirect("/time-blocks?error=update_failed");
    }
    throw scopedError;
  }

  const updated = await prisma.timeBlock.updateMany({
    where: { id: data.id, category: { userId: user.id } },
    data: buildFullTimeBlockUpdateData(data, range),
  });

  if (updated.count === 0) {
    redirect("/time-blocks?error=update_failed");
  }

  revalidatePath("/time-blocks");
  revalidatePath("/calendar");
  redirect("/time-blocks?success=updated");
}

export async function deleteTimeBlock(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  try {
    await assertTimeBlockOwned(user.id, id);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return;
    }
    throw error;
  }

  const deleted = await prisma.timeBlock.deleteMany({
    where: { id, category: { userId: user.id } },
  });

  if (deleted.count === 0) {
    redirect("/time-blocks?error=delete_failed");
  }

  revalidatePath("/time-blocks");
  revalidatePath("/calendar");
  redirect("/time-blocks?success=deleted");
}
