"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCategoryOwned, assertRoutineOwned } from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import { prisma } from "@/lib/prisma";
import type { RoutineValidationError } from "@/lib/routines/routine-types";
import {
  normalizeDaysOfWeek,
  parseDateOnly,
  validateRoutineInput,
} from "@/lib/routines/routine-validation";
import { requireUser } from "@/lib/session";

function parseOptionalNotes(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseOptionalCategoryId(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseDaysOfWeek(formData: FormData): number[] {
  return formData
    .getAll("daysOfWeek")
    .map((value) => Number(String(value)))
    .filter((day) => !Number.isNaN(day));
}

function parseRoutineFormData(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const categoryId = parseOptionalCategoryId(formData.get("categoryId"));
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const daysOfWeek = normalizeDaysOfWeek(parseDaysOfWeek(formData));
  const startDateRaw = String(formData.get("startDate") ?? "").trim();
  const endDateRaw = String(formData.get("endDate") ?? "").trim();
  const notes = parseOptionalNotes(formData.get("notes"));

  const startDate = parseDateOnly(startDateRaw);
  const endDate = endDateRaw ? parseDateOnly(endDateRaw) : null;

  return {
    title,
    categoryId,
    startTime,
    endTime,
    daysOfWeek,
    startDate: startDate ?? new Date(Number.NaN),
    endDate,
    notes,
  };
}

function redirectWithValidationError(error: RoutineValidationError): never {
  redirect(`/routines?error=${error}`);
}

async function validateCategoryRequired(
  userId: string,
  categoryId: string | null,
): Promise<void> {
  if (!categoryId || !categoryId.trim()) {
    redirect("/routines?error=missing_category");
  }

  try {
    await assertCategoryOwned(userId, categoryId);
  } catch (error) {
    if (isScopedAccessError(error)) {
      redirect("/routines?error=invalid_category");
    }
    throw error;
  }
}

export async function createRoutine(formData: FormData): Promise<void> {
  const user = await requireUser();
  const input = parseRoutineFormData(formData);

  const validationError = validateRoutineInput(input);
  if (validationError) {
    redirectWithValidationError(validationError);
  }

  await validateCategoryRequired(user.id, input.categoryId);

  await prisma.routine.create({
    data: {
      userId: user.id,
      title: input.title.trim(),
      categoryId: input.categoryId,
      startTime: input.startTime,
      endTime: input.endTime,
      daysOfWeek: input.daysOfWeek,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      isActive: true,
    },
  });

  revalidatePath("/routines");
  redirect("/routines?success=created");
}

export async function updateRoutine(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  try {
    await assertRoutineOwned(user.id, id);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return;
    }
    throw error;
  }

  const input = parseRoutineFormData(formData);
  const validationError = validateRoutineInput(input);
  if (validationError) {
    redirectWithValidationError(validationError);
  }

  await validateCategoryRequired(user.id, input.categoryId);

  await prisma.routine.updateMany({
    where: { id, userId: user.id },
    data: {
      title: input.title.trim(),
      categoryId: input.categoryId,
      startTime: input.startTime,
      endTime: input.endTime,
      daysOfWeek: input.daysOfWeek,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
    },
  });

  revalidatePath("/routines");
  redirect("/routines?success=updated");
}

export async function toggleRoutineActive(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  let routine;
  try {
    routine = await assertRoutineOwned(user.id, id);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return;
    }
    throw error;
  }

  await prisma.routine.updateMany({
    where: { id, userId: user.id },
    data: { isActive: !routine.isActive },
  });

  revalidatePath("/routines");
  redirect(`/routines?success=${routine.isActive ? "deactivated" : "activated"}`);
}

export async function deleteRoutine(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  try {
    await assertRoutineOwned(user.id, id);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return;
    }
    throw error;
  }

  await prisma.routine.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/routines");
  redirect("/routines?success=deleted");
}
