"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  buildFullTimeBlockUpdateData,
  parseTimeBlockFormData,
  validateFullTimeBlockForm,
} from "@/lib/actions/time-block-shared";
import { clampCompletionLevel } from "@/lib/validation";

function redirectOnValidationError(error: string): void {
  redirect(`/time-blocks?error=${error}`);
}

export async function createTimeBlock(formData: FormData): Promise<void> {
  const data = parseTimeBlockFormData(formData);

  const { error, range } = validateFullTimeBlockForm(data);

  if (error) {
    redirectOnValidationError(error);
  }

  if (!range) {
    redirect("/time-blocks?error=invalid_range");
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
    await prisma.timeBlock.update({
      where: { id: data.id },
      data: buildFullTimeBlockUpdateData(data, range),
    });
  } catch {
    redirect("/time-blocks?error=update_failed");
  }

  revalidatePath("/time-blocks");
  revalidatePath("/calendar");
  redirect("/time-blocks?success=updated");
}

export async function deleteTimeBlock(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  try {
    await prisma.timeBlock.delete({ where: { id } });
  } catch {
    redirect("/time-blocks?error=delete_failed");
  }

  revalidatePath("/time-blocks");
  revalidatePath("/calendar");
  redirect("/time-blocks?success=deleted");
}
