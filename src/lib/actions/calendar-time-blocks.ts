"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildCalendarRedirectPath,
  buildFullTimeBlockUpdateData,
  parseScheduleInput,
  parseTimeBlockFormData,
  validateFullTimeBlockForm,
  validateScheduleTimes,
  type ScheduleUpdateError,
  type UpdateTimeBlockScheduleInput,
} from "@/lib/actions/time-block-shared";
import {
  assertCategoryOwned,
  assertTimeBlockOwned,
} from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getValidTimeBlockRange } from "@/lib/validation";

export type ScheduleUpdateResult =
  | { ok: true }
  | { ok: false; error: ScheduleUpdateError };

/** Full TimeBlock edit from the calendar page; redirects back to /calendar. */
export async function updateTimeBlockFromCalendar(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const data = parseTimeBlockFormData(formData);

  if (!data.id) {
    redirect(buildCalendarRedirectPath(formData, { error: "missing_fields" }));
  }

  const { error, range } = validateFullTimeBlockForm(data);

  if (error || !range) {
    redirect(
      buildCalendarRedirectPath(formData, {
        error: error ?? "invalid_range",
      }),
    );
  }

  try {
    await assertTimeBlockOwned(user.id, data.id);
    await assertCategoryOwned(user.id, data.categoryId);
  } catch (scopedError) {
    if (isScopedAccessError(scopedError)) {
      redirect(buildCalendarRedirectPath(formData, { error: "update_failed" }));
    }
    throw scopedError;
  }

  const updated = await prisma.timeBlock.updateMany({
    where: { id: data.id, category: { userId: user.id } },
    data: buildFullTimeBlockUpdateData(data, range),
  });

  if (updated.count === 0) {
    redirect(buildCalendarRedirectPath(formData, { error: "update_failed" }));
  }

  revalidatePath("/calendar");
  revalidatePath("/time-blocks");
  redirect(buildCalendarRedirectPath(formData, { success: "updated" }));
}

/**
 * Update only startTime/endTime (drag/resize). No redirect — for client refresh.
 */
export async function updateTimeBlockSchedule(
  input: UpdateTimeBlockScheduleInput,
): Promise<ScheduleUpdateResult> {
  const user = await requireUser();
  const { id, startTime, endTime } = parseScheduleInput(input);

  if (!id) {
    return { ok: false, error: "missing_fields" };
  }

  const scheduleError = validateScheduleTimes(startTime, endTime);
  if (scheduleError) {
    return { ok: false, error: scheduleError };
  }

  const range = getValidTimeBlockRange(startTime, endTime);
  if (!range) {
    return { ok: false, error: "invalid_range" };
  }

  try {
    await assertTimeBlockOwned(user.id, id);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return { ok: false, error: "update_failed" };
    }
    throw error;
  }

  const updated = await prisma.timeBlock.updateMany({
    where: { id, category: { userId: user.id } },
    data: {
      startTime: range.start,
      endTime: range.end,
    },
  });

  if (updated.count === 0) {
    return { ok: false, error: "update_failed" };
  }

  revalidatePath("/calendar");
  revalidatePath("/time-blocks");
  return { ok: true };
}
