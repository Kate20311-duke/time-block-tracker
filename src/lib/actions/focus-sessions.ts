"use server";

import { revalidatePath } from "next/cache";
import type { FocusSession } from "@/generated/prisma";
import {
  buildFocusSessionEndUpdate,
  buildStopwatchAbandonUpdate,
  canAbandonFocusSession,
  canCompleteFocusSession,
  canCompleteStopwatch,
  canConvertFocusSession,
  completeStopwatchInTransaction,
  computeResumeStopwatchUpdate,
  convertFocusSessionInTransaction,
  defaultStopwatchTitle,
  defaultTimeBlockTitleFromFocus,
  FocusConvertTransactionError,
  parseFocusSessionCreateInput,
  parseStopwatchCompleteInput,
  parseStopwatchCreateInput,
  rejectStopwatchStartWhenActive,
  validateFocusSessionStatusUpdate,
  type FocusSessionActionError,
} from "@/lib/actions/focus-shared";
import {
  activeFocusSessionForUser,
  assertCategoryOwned,
  assertFocusSessionOwned,
} from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getValidTimeBlockRange } from "@/lib/validation";

export type FocusSessionResult<T extends { id: string } = { id: string }> =
  | { ok: true; data: T }
  | { ok: false; error: FocusSessionActionError };

function revalidateFocusRelatedPaths(): void {
  revalidatePath("/focus");
  revalidatePath("/time-blocks");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

async function assertNoActiveFocusSession(
  userId: string,
): Promise<FocusSessionResult | null> {
  const active = await activeFocusSessionForUser(userId);
  const error = rejectStopwatchStartWhenActive(active !== null);
  if (error) {
    return { ok: false, error };
  }
  return null;
}

async function getOwnedFocusSessionOrError(
  userId: string,
  id: string,
): Promise<
  | { ok: true; session: FocusSession }
  | { ok: false; error: FocusSessionActionError }
> {
  try {
    const session = await assertFocusSessionOwned(userId, id);
    return { ok: true, session };
  } catch (error) {
    if (isScopedAccessError(error)) {
      return { ok: false, error: "not_found" };
    }
    throw error;
  }
}

export async function createFocusSession(input: {
  categoryId: string;
  plannedDurationMinutes: number;
  title?: string | null;
  note?: string | null;
  startTime?: string | Date;
  status?: string;
}): Promise<FocusSessionResult> {
  const user = await requireUser();
  const { fields, error } = parseFocusSessionCreateInput(input);
  if (error) {
    return { ok: false, error };
  }

  try {
    await assertCategoryOwned(user.id, fields.categoryId);
  } catch (scopedError) {
    if (isScopedAccessError(scopedError)) {
      return { ok: false, error: "invalid_category" };
    }
    throw scopedError;
  }

  const activeConflict = await assertNoActiveFocusSession(user.id);
  if (activeConflict) {
    return activeConflict;
  }

  try {
    const session = await prisma.focusSession.create({
      data: {
        title: fields.title,
        note: fields.note,
        categoryId: fields.categoryId,
        startTime: fields.startTime,
        plannedDurationMinutes: Math.round(fields.plannedDurationMinutes),
        status: fields.status,
        mode: "pomodoro",
      },
    });
    revalidateFocusRelatedPaths();
    return { ok: true, data: { id: session.id } };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

export async function updateFocusSessionStatus(input: {
  id: string;
  status: string;
}): Promise<FocusSessionResult> {
  const user = await requireUser();
  const statusError = validateFocusSessionStatusUpdate(input.status);
  if (statusError) {
    return { ok: false, error: statusError };
  }

  const lookup = await getOwnedFocusSessionOrError(user.id, input.id);
  if (!lookup.ok) {
    return lookup;
  }

  const { session } = lookup;
  if (session.convertedToTimeBlock || session.status === "converted") {
    return { ok: false, error: "invalid_state" };
  }

  try {
    const updated = await prisma.focusSession.updateMany({
      where: { id: session.id, category: { userId: user.id } },
      data: { status: input.status },
    });
    if (updated.count === 0) {
      return { ok: false, error: "not_found" };
    }
    revalidateFocusRelatedPaths();
    return { ok: true, data: { id: session.id } };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

export async function completeFocusSession(input: {
  id: string;
  endTime?: string | Date;
}): Promise<FocusSessionResult> {
  const user = await requireUser();
  const lookup = await getOwnedFocusSessionOrError(user.id, input.id);
  if (!lookup.ok) {
    return lookup;
  }

  const { session } = lookup;
  if (!canCompleteFocusSession(session.status)) {
    return { ok: false, error: "invalid_state" };
  }

  const endTime =
    input.endTime === undefined
      ? new Date()
      : input.endTime instanceof Date
        ? input.endTime
        : new Date(input.endTime);

  const endUpdate = buildFocusSessionEndUpdate(session, endTime);
  if (typeof endUpdate === "string") {
    return { ok: false, error: endUpdate };
  }

  try {
    const updated = await prisma.focusSession.updateMany({
      where: { id: session.id, category: { userId: user.id } },
      data: {
        status: "completed",
        endTime: endUpdate.endTime,
        actualDurationMinutes: endUpdate.actualDurationMinutes,
      },
    });
    if (updated.count === 0) {
      return { ok: false, error: "not_found" };
    }
    revalidateFocusRelatedPaths();
    return { ok: true, data: { id: session.id } };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

export async function abandonFocusSession(input: {
  id: string;
  endTime?: string | Date;
}): Promise<FocusSessionResult> {
  const user = await requireUser();
  const lookup = await getOwnedFocusSessionOrError(user.id, input.id);
  if (!lookup.ok) {
    return lookup;
  }

  const { session } = lookup;
  if (!canAbandonFocusSession(session.status)) {
    return { ok: false, error: "invalid_state" };
  }

  let endTime: Date | null = null;
  let actualDurationMinutes: number | null = null;

  if (input.endTime !== undefined) {
    endTime =
      input.endTime instanceof Date ? input.endTime : new Date(input.endTime);
    const endUpdate = buildFocusSessionEndUpdate(session, endTime);
    if (typeof endUpdate === "string") {
      return { ok: false, error: endUpdate };
    }
    actualDurationMinutes = endUpdate.actualDurationMinutes;
  }

  try {
    const updated = await prisma.focusSession.updateMany({
      where: {
        id: session.id,
        status: { in: ["running", "planned", "paused"] },
        category: { userId: user.id },
      },
      data: {
        status: "abandoned",
        endTime,
        actualDurationMinutes,
      },
    });
    if (updated.count === 0) {
      return { ok: false, error: "not_found" };
    }
    revalidateFocusRelatedPaths();
    return { ok: true, data: { id: session.id } };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

export async function convertFocusSessionToTimeBlock(input: {
  id: string;
  /** Localized fallback when FocusSession has no title. */
  defaultTitle?: string;
}): Promise<FocusSessionResult<{ id: string; timeBlockId: string }>> {
  const user = await requireUser();

  let session: FocusSession;
  try {
    session = await assertFocusSessionOwned(user.id, input.id);
    await assertCategoryOwned(user.id, session.categoryId);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return { ok: false, error: "not_found" };
    }
    throw error;
  }

  if (!canConvertFocusSession(session)) {
    if (session.convertedToTimeBlock || session.status === "converted") {
      return { ok: false, error: "already_converted" };
    }
    return { ok: false, error: "invalid_state" };
  }

  const range = getValidTimeBlockRange(session.startTime, session.endTime);
  if (!range) {
    return { ok: false, error: "invalid_range" };
  }

  const title = defaultTimeBlockTitleFromFocus(session, input.defaultTitle);

  try {
    const timeBlock = await prisma.$transaction(async (tx) =>
      convertFocusSessionInTransaction(session, title, range, user.id, tx),
    );

    revalidateFocusRelatedPaths();
    return {
      ok: true,
      data: { id: session.id, timeBlockId: timeBlock.timeBlockId },
    };
  } catch (err) {
    if (err instanceof FocusConvertTransactionError) {
      return { ok: false, error: err.code };
    }
    return { ok: false, error: "convert_failed" };
  }
}

export async function startStopwatch(input: {
  categoryId: string;
  title?: string | null;
  note?: string | null;
}): Promise<FocusSessionResult> {
  const user = await requireUser();
  const { fields, error } = parseStopwatchCreateInput(input);
  if (error) {
    return { ok: false, error };
  }

  try {
    await assertCategoryOwned(user.id, fields.categoryId);
  } catch (scopedError) {
    if (isScopedAccessError(scopedError)) {
      return { ok: false, error: "invalid_category" };
    }
    throw scopedError;
  }

  const activeConflict = await assertNoActiveFocusSession(user.id);
  if (activeConflict) {
    return activeConflict;
  }

  try {
    const session = await prisma.focusSession.create({
      data: {
        title: fields.title,
        note: fields.note,
        categoryId: fields.categoryId,
        startTime: fields.startTime,
        plannedDurationMinutes: fields.plannedDurationMinutes,
        status: fields.status,
        mode: fields.mode,
      },
    });
    revalidateFocusRelatedPaths();
    return { ok: true, data: { id: session.id } };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

export async function pauseStopwatch(input: {
  id: string;
}): Promise<FocusSessionResult> {
  const user = await requireUser();
  const lookup = await getOwnedFocusSessionOrError(user.id, input.id);
  if (!lookup.ok) {
    return lookup;
  }

  const { session } = lookup;
  if (session.mode !== "stopwatch" || session.status !== "running") {
    return { ok: false, error: "invalid_state" };
  }

  const pausedAt = new Date();

  try {
    const updated = await prisma.focusSession.updateMany({
      where: {
        id: session.id,
        status: "running",
        mode: "stopwatch",
        category: { userId: user.id },
      },
      data: {
        status: "paused",
        pausedAt,
      },
    });
    if (updated.count === 0) {
      return { ok: false, error: "invalid_state" };
    }
    revalidateFocusRelatedPaths();
    return { ok: true, data: { id: session.id } };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

export async function resumeStopwatch(input: {
  id: string;
}): Promise<FocusSessionResult> {
  const user = await requireUser();
  const lookup = await getOwnedFocusSessionOrError(user.id, input.id);
  if (!lookup.ok) {
    return lookup;
  }

  const { session } = lookup;
  if (session.mode !== "stopwatch" || session.status !== "paused") {
    return { ok: false, error: "invalid_state" };
  }

  const now = new Date();
  const resumeUpdate = computeResumeStopwatchUpdate(session, now);

  try {
    const updated = await prisma.focusSession.updateMany({
      where: {
        id: session.id,
        status: "paused",
        mode: "stopwatch",
        category: { userId: user.id },
      },
      data: resumeUpdate,
    });
    if (updated.count === 0) {
      return { ok: false, error: "invalid_state" };
    }
    revalidateFocusRelatedPaths();
    return { ok: true, data: { id: session.id } };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}

export async function completeStopwatchAndCreateTimeBlock(input: {
  id: string;
  defaultTitle?: string;
  instantRecordTitle?: string;
  title?: string | null;
  note?: string | null;
  status?: string | null;
  completionLevel?: number | null;
}): Promise<FocusSessionResult<{ id: string; timeBlockId: string }>> {
  const user = await requireUser();

  let session: FocusSession;
  let categoryName: string;
  try {
    const owned = await prisma.focusSession.findFirst({
      where: { id: input.id.trim(), category: { userId: user.id } },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!owned) {
      return { ok: false, error: "not_found" };
    }
    session = owned;
    categoryName = owned.category.name;
    await assertCategoryOwned(user.id, session.categoryId);
  } catch (error) {
    if (isScopedAccessError(error)) {
      return { ok: false, error: "not_found" };
    }
    throw error;
  }

  if (session.mode !== "stopwatch") {
    return { ok: false, error: "invalid_state" };
  }
  if (!canCompleteStopwatch(session.status) || session.convertedToTimeBlock) {
    if (session.convertedToTimeBlock) {
      return { ok: false, error: "already_converted" };
    }
    return { ok: false, error: "invalid_state" };
  }

  const defaultTitle = defaultStopwatchTitle(
    session,
    categoryName,
    input.instantRecordTitle ??
      input.defaultTitle ??
      defaultTimeBlockTitleFromFocus(session, input.defaultTitle),
  );

  const { fields: completeFields, error: completeError } =
    parseStopwatchCompleteInput({
      title: input.title,
      note: input.note,
      status: input.status,
      completionLevel: input.completionLevel,
      defaultTitle,
      defaultNote: session.note,
    });
  if (completeError) {
    return { ok: false, error: completeError };
  }

  const wallClockEndTime = new Date();

  try {
    const result = await prisma.$transaction(async (tx) =>
      completeStopwatchInTransaction(
        session,
        completeFields,
        wallClockEndTime,
        user.id,
        tx,
      ),
    );
    revalidateFocusRelatedPaths();
    return {
      ok: true,
      data: { id: session.id, timeBlockId: result.timeBlockId },
    };
  } catch (err) {
    if (err instanceof FocusConvertTransactionError) {
      if (err.code === "already_converted") {
        return { ok: false, error: "already_converted" };
      }
      return { ok: false, error: "invalid_state" };
    }
    return { ok: false, error: "convert_failed" };
  }
}

export async function cancelStopwatch(input: {
  id: string;
}): Promise<FocusSessionResult> {
  const user = await requireUser();
  const lookup = await getOwnedFocusSessionOrError(user.id, input.id);
  if (!lookup.ok) {
    return lookup;
  }

  const { session } = lookup;
  if (
    session.mode !== "stopwatch" ||
    !canCompleteStopwatch(session.status)
  ) {
    return { ok: false, error: "invalid_state" };
  }

  const wallClockEndTime = new Date();
  const endUpdate = buildStopwatchAbandonUpdate(session, wallClockEndTime);
  if (typeof endUpdate === "string") {
    return { ok: false, error: endUpdate };
  }

  try {
    const updated = await prisma.focusSession.updateMany({
      where: {
        id: session.id,
        status: { in: ["running", "paused"] },
        mode: "stopwatch",
        category: { userId: user.id },
      },
      data: {
        status: "abandoned",
        endTime: endUpdate.endTime,
        actualDurationMinutes: endUpdate.actualDurationMinutes,
        pausedAt: endUpdate.pausedAt,
        pausedTotalSeconds: endUpdate.pausedTotalSeconds,
      },
    });
    if (updated.count === 0) {
      return { ok: false, error: "invalid_state" };
    }
    revalidateFocusRelatedPaths();
    return { ok: true, data: { id: session.id } };
  } catch {
    return { ok: false, error: "update_failed" };
  }
}
