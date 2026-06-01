import {
  STOPWATCH_PLANNED_DURATION_PLACEHOLDER_MINUTES,
  type FocusSessionMode,
} from "@/lib/constants";
import { durationMinutes } from "@/lib/time";
import {
  isValidFocusSessionStatus,
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

export function canCompleteFocusSession(status: string): boolean {
  return status === "planned" || status === "running";
}

export function canAbandonFocusSession(status: string): boolean {
  return status === "planned" || status === "running";
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
        status: string;
        mode: string;
        category: { userId: string };
      };
      data: {
        status: string;
        convertedToTimeBlock: boolean;
        endTime: Date;
        actualDurationMinutes: number;
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
 * End a running stopwatch and create its TimeBlock in one transaction.
 * Claim runs before create to prevent duplicate blocks on double-submit.
 */
export async function completeStopwatchInTransaction(
  session: {
    id: string;
    title: string | null;
    note: string | null;
    categoryId: string;
    startTime: Date;
  },
  title: string,
  endTime: Date,
  userId: string,
  tx: StopwatchCompleteTransactionClient,
): Promise<{ timeBlockId: string; actualDurationMinutes: number }> {
  const rangeError = validateFocusSessionTimeRange(session.startTime, endTime);
  if (rangeError) {
    throw new FocusConvertTransactionError("invalid_state");
  }

  const actualDurationMinutes = durationMinutes(session.startTime, endTime);

  const claimed = await tx.focusSession.updateMany({
    where: {
      id: session.id,
      convertedToTimeBlock: false,
      status: "running",
      mode: "stopwatch",
      category: { userId },
    },
    data: {
      status: "completed",
      convertedToTimeBlock: true,
      endTime,
      actualDurationMinutes,
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
      startTime: session.startTime,
      endTime,
      status: "completed",
      completionLevel: 100,
      source: "stopwatch",
    },
  });

  await tx.focusSession.update({
    where: { id: session.id },
    data: { timeBlockId: block.id },
  });

  return { timeBlockId: block.id, actualDurationMinutes };
}
