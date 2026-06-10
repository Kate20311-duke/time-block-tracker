import {
  STOPWATCH_PLANNED_DURATION_PLACEHOLDER_MINUTES,
  type FocusSessionMode,
} from "@/lib/constants";
import {
  activeDurationMinutesFromSession,
  computeStopwatchTimeBlockEndTime,
  finalizePausedTotalSeconds,
  type FocusSessionPauseFields,
} from "@/lib/focus-session-elapsed";
import { durationMinutes } from "@/lib/time";
import {
  completionLevelFromStatus,
  isValidFocusSessionStatus,
  isValidTimeBlockStatus,
  validateFocusSessionCreate,
  validateFocusSessionTimeRange,
  type FocusSessionValidationError,
} from "@/lib/validation";

export type FocusSessionFields = {
  title: string | null;
  note: string | null;
  categoryId: string;
  startTime: Date;
  endTime: Date | null;
  plannedDurationMinutes: number;
  actualDurationMinutes: number | null;
  status: string;
};

export type FocusSessionActionError =
  | FocusSessionValidationError
  | "not_found"
  | "invalid_state"
  | "already_converted"
  | "session_already_running"
  | "update_failed"
  | "convert_failed";

function parseOptionalText(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

/** Build create payload from server action input. */
export function parseFocusSessionCreateInput(input: {
  categoryId: string;
  plannedDurationMinutes: number;
  title?: string | null;
  note?: string | null;
  startTime?: string | Date;
  status?: string;
}): {
  fields: Omit<FocusSessionFields, "endTime" | "actualDurationMinutes"> & {
    endTime: null;
    actualDurationMinutes: null;
  };
  error: FocusSessionValidationError | null;
} {
  const startTime =
    input.startTime === undefined
      ? new Date()
      : input.startTime instanceof Date
        ? input.startTime
        : new Date(input.startTime);

  const status = input.status?.trim() || "planned";

  const fields = {
    title: parseOptionalText(input.title),
    note: parseOptionalText(input.note),
    categoryId: String(input.categoryId ?? "").trim(),
    startTime,
    endTime: null,
    plannedDurationMinutes: Number(input.plannedDurationMinutes),
    actualDurationMinutes: null,
    status,
  };

  const error = validateFocusSessionCreate({
    categoryId: fields.categoryId,
    plannedDurationMinutes: fields.plannedDurationMinutes,
    startTime: fields.startTime,
    endTime: null,
    status: fields.status,
  });

  return { fields, error };
}

/** Build stopwatch create payload (positive timer; no planned countdown). */
export function parseStopwatchCreateInput(input: {
  categoryId: string;
  title?: string | null;
  note?: string | null;
}): {
  fields: {
    title: string | null;
    note: string | null;
    categoryId: string;
    startTime: Date;
    plannedDurationMinutes: number;
    status: string;
    mode: FocusSessionMode;
  };
  error: FocusSessionValidationError | null;
} {
  const fields = {
    title: parseOptionalText(input.title),
    note: parseOptionalText(input.note),
    categoryId: String(input.categoryId ?? "").trim(),
    startTime: new Date(),
    plannedDurationMinutes: STOPWATCH_PLANNED_DURATION_PLACEHOLDER_MINUTES,
    status: "running",
    mode: "stopwatch" as const,
  };

  const error = validateFocusSessionCreate({
    categoryId: fields.categoryId,
    plannedDurationMinutes: fields.plannedDurationMinutes,
    startTime: fields.startTime,
    endTime: null,
    status: fields.status,
    mode: fields.mode,
  });

  return { fields, error };
}

export function validateFocusSessionStatusUpdate(
  status: string,
): FocusSessionValidationError | null {
  if (!isValidFocusSessionStatus(status)) {
    return "invalid_status";
  }
  return null;
}

export function buildFocusSessionEndUpdate(
  session: { startTime: Date },
  endTime: Date,
): { endTime: Date; actualDurationMinutes: number } | FocusSessionValidationError {
  const rangeError = validateFocusSessionTimeRange(session.startTime, endTime);
  if (rangeError) {
    return rangeError;
  }
  return {
    endTime,
    actualDurationMinutes: durationMinutes(session.startTime, endTime),
  };
}

/** Abandon/cancel stopwatch using active duration (excludes pauses). */
export function buildStopwatchAbandonUpdate(
  session: FocusSessionPauseFields,
  wallClockEndTime: Date,
):
  | {
      endTime: Date;
      actualDurationMinutes: number;
      pausedAt: null;
      pausedTotalSeconds: number;
    }
  | FocusSessionValidationError {
  const finalizedPausedTotal = finalizePausedTotalSeconds(session, wallClockEndTime);
  const sessionForDuration: FocusSessionPauseFields = {
    startTime: session.startTime,
    status: "running",
    pausedAt: null,
    pausedTotalSeconds: finalizedPausedTotal,
  };
  const timeBlockEndTime = computeStopwatchTimeBlockEndTime(
    sessionForDuration,
    wallClockEndTime,
  );
  const rangeError = validateFocusSessionTimeRange(
    session.startTime,
    timeBlockEndTime,
  );
  if (rangeError) {
    return rangeError;
  }
  return {
    endTime: wallClockEndTime,
    actualDurationMinutes: activeDurationMinutesFromSession(
      sessionForDuration,
      wallClockEndTime,
    ),
    pausedAt: null,
    pausedTotalSeconds: finalizedPausedTotal,
  };
}

export function computeResumeStopwatchUpdate(
  session: FocusSessionPauseFields,
  now: Date,
): {
  status: "running";
  pausedAt: null;
  pausedTotalSeconds: number;
} {
  const pausedAtMs = session.pausedAt?.getTime() ?? now.getTime();
  const segmentSeconds = Math.max(
    0,
    Math.floor((now.getTime() - pausedAtMs) / 1000),
  );
  return {
    status: "running",
    pausedAt: null,
    pausedTotalSeconds: Math.max(0, session.pausedTotalSeconds) + segmentSeconds,
  };
}

/** Client and server guard before starting a new stopwatch. */
export function rejectStopwatchStartWhenActive(
  hasActiveSession: boolean,
): "session_already_running" | null {
  return hasActiveSession ? "session_already_running" : null;
}

export function canCompleteFocusSession(status: string): boolean {
  return status === "planned" || status === "running";
}

export function canAbandonFocusSession(status: string): boolean {
  return status === "planned" || status === "running" || status === "paused";
}

export function canCompleteStopwatch(status: string): boolean {
  return status === "running" || status === "paused";
}

export function canConvertFocusSession(session: {
  status: string;
  convertedToTimeBlock: boolean;
  endTime: Date | null;
}): boolean {
  return (
    session.status === "completed" &&
    !session.convertedToTimeBlock &&
    session.endTime !== null
  );
}

export const DEFAULT_FOCUS_TIME_BLOCK_TITLE = "Focus Session";

export type StopwatchCompleteInput = {
  title: string;
  note: string | null;
  status: string;
  completionLevel: number;
};

export function parseStopwatchCompleteInput(input: {
  title?: string | null;
  note?: string | null;
  status?: string | null;
  completionLevel?: number | null;
  defaultTitle: string;
  defaultNote?: string | null;
}): { fields: StopwatchCompleteInput; error: FocusSessionValidationError | null } {
  const title = String(input.title ?? input.defaultTitle ?? "").trim() || input.defaultTitle;
  const note = parseOptionalText(input.note ?? input.defaultNote);
  const status = String(input.status ?? "completed").trim() || "completed";

  if (!isValidTimeBlockStatus(status)) {
    return { fields: { title, note, status, completionLevel: 0 }, error: "invalid_status" };
  }

  let completionLevel =
    input.completionLevel === null || input.completionLevel === undefined
      ? completionLevelFromStatus(status)
      : Number(input.completionLevel);

  if (Number.isNaN(completionLevel) || completionLevel < 0 || completionLevel > 100) {
    return { fields: { title, note, status, completionLevel: 0 }, error: "invalid_completion" };
  }

  completionLevel = Math.round(completionLevel);

  return { fields: { title, note, status, completionLevel }, error: null };
}

export function defaultStopwatchTitle(
  session: { title: string | null },
  categoryName: string,
  fallbackTitle: string,
): string {
  const trimmed = session.title?.trim();
  if (trimmed) {
    return trimmed;
  }
  const categoryTrimmed = categoryName.trim();
  if (categoryTrimmed) {
    return categoryTrimmed;
  }
  return fallbackTitle;
}

export class FocusConvertTransactionError extends Error {
  readonly code: "already_converted" | "invalid_state";

  constructor(code: "already_converted" | "invalid_state") {
    super(code);
    this.code = code;
  }
}

export type FocusConvertTransactionClient = {
  focusSession: {
    updateMany(args: {
      where: {
        id: string;
        convertedToTimeBlock: boolean;
        status: string;
        category: { userId: string };
      };
      data: {
        status: string;
        convertedToTimeBlock: boolean;
        timeBlockId?: string;
      };
    }): Promise<{ count: number }>;
    update(args: {
      where: { id: string };
      data: { timeBlockId: string };
    }): Promise<unknown>;
  };
  timeBlock: {
    create(args: {
      data: {
        title: string;
        note: string | null;
        categoryId: string;
        startTime: Date;
        endTime: Date;
        status: string;
        completionLevel: number;
        source: string;
      };
    }): Promise<{ id: string }>;
  };
};

export type StopwatchCompleteTransactionClient = FocusConvertTransactionClient & {
  focusSession: FocusConvertTransactionClient["focusSession"] & {
    updateMany(args: {
      where: {
        id: string;
        convertedToTimeBlock: boolean;
        status: { in: string[] };
        mode: string;
        category: { userId: string };
      };
      data: {
        status: string;
        convertedToTimeBlock: boolean;
        endTime: Date;
        actualDurationMinutes: number;
        pausedAt?: null;
        pausedTotalSeconds?: number;
        timeBlockId?: string;
      };
    }): Promise<{ count: number }>;
  };
};

/**
 * Claim a completed FocusSession, then create its TimeBlock.
 * Claim runs before create so a failed/racing conversion cannot leave orphan blocks.
 *
 * `userId` on the claim ensures the session (and its category) belong to the
 * current user, so the created TimeBlock cannot be linked to another user's category.
 */
export async function convertFocusSessionInTransaction(
  session: {
    id: string;
    note: string | null;
    categoryId: string;
  },
  title: string,
  range: { start: Date; end: Date },
  userId: string,
  tx: FocusConvertTransactionClient,
): Promise<{ timeBlockId: string }> {
  const claimed = await tx.focusSession.updateMany({
    where: {
      id: session.id,
      convertedToTimeBlock: false,
      status: "completed",
      category: { userId },
    },
    data: {
      status: "converted",
      convertedToTimeBlock: true,
    },
  });

  if (claimed.count === 0) {
    throw new FocusConvertTransactionError("already_converted");
  }

  const block = await tx.timeBlock.create({
    data: {
      title,
      note: session.note,
      categoryId: session.categoryId,
      startTime: range.start,
      endTime: range.end,
      status: "completed",
      completionLevel: 100,
      source: "pomodoro",
    },
  });

  await tx.focusSession.update({
    where: { id: session.id },
    data: { timeBlockId: block.id },
  });

  return { timeBlockId: block.id };
}

/**
 * End a running/paused stopwatch and create its TimeBlock in one transaction.
 * TimeBlock.endTime = startTime + active duration (excludes pauses).
 * FocusSession.endTime = wall-clock completion time.
 */
export async function completeStopwatchInTransaction(
  session: FocusSessionPauseFields & {
    id: string;
    note: string | null;
    categoryId: string;
  },
  completeInput: StopwatchCompleteInput,
  wallClockEndTime: Date,
  userId: string,
  tx: StopwatchCompleteTransactionClient,
): Promise<{ timeBlockId: string; actualDurationMinutes: number }> {
  const finalizedPausedTotal = finalizePausedTotalSeconds(session, wallClockEndTime);
  const sessionForDuration: FocusSessionPauseFields = {
    startTime: session.startTime,
    status: "running",
    pausedAt: null,
    pausedTotalSeconds: finalizedPausedTotal,
  };

  const timeBlockEndTime = computeStopwatchTimeBlockEndTime(
    sessionForDuration,
    wallClockEndTime,
  );

  const rangeError = validateFocusSessionTimeRange(
    session.startTime,
    timeBlockEndTime,
  );
  if (rangeError) {
    throw new FocusConvertTransactionError("invalid_state");
  }

  const actualDurationMinutes = activeDurationMinutesFromSession(
    sessionForDuration,
    wallClockEndTime,
  );

  const claimed = await tx.focusSession.updateMany({
    where: {
      id: session.id,
      convertedToTimeBlock: false,
      status: { in: ["running", "paused"] },
      mode: "stopwatch",
      category: { userId },
    },
    data: {
      status: "completed",
      convertedToTimeBlock: true,
      endTime: wallClockEndTime,
      actualDurationMinutes,
      pausedAt: null,
      pausedTotalSeconds: finalizedPausedTotal,
    },
  });

  if (claimed.count === 0) {
    throw new FocusConvertTransactionError("already_converted");
  }

  const block = await tx.timeBlock.create({
    data: {
      title: completeInput.title,
      note: completeInput.note,
      categoryId: session.categoryId,
      startTime: session.startTime,
      endTime: timeBlockEndTime,
      status: completeInput.status,
      completionLevel: completeInput.completionLevel,
      source: "stopwatch",
    },
  });

  await tx.focusSession.update({
    where: { id: session.id },
    data: { timeBlockId: block.id },
  });

  return { timeBlockId: block.id, actualDurationMinutes };
}

export function defaultTimeBlockTitleFromFocus(
  session: {
    title: string | null;
    plannedDurationMinutes: number;
  },
  fallbackTitle: string = DEFAULT_FOCUS_TIME_BLOCK_TITLE,
): string {
  const trimmed = session.title?.trim();
  if (trimmed) {
    return trimmed;
  }
  return fallbackTitle;
}
