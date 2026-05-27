"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
import { getValidTimeBlockRange } from "@/lib/validation";

export type ScheduleUpdateResult =
  | { ok: true }
  | { ok: false; error: ScheduleUpdateError };

/** Full TimeBlock edit from the calendar page; redirects back to /calendar. */
export async function updateTimeBlockFromCalendar(
  formData: FormData,
): Promise<void> {
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
    await prisma.timeBlock.update({
      where: { id: data.id },
      data: buildFullTimeBlockUpdateData(data, range),
    });
  } catch {
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
    await prisma.timeBlock.update({
      where: { id },
      data: {
        startTime: range.start,
        endTime: range.end,
      },
    });
  } catch {
    return { ok: false, error: "update_failed" };
  }

  revalidatePath("/calendar");
  revalidatePath("/time-blocks");
  return { ok: true };
}
