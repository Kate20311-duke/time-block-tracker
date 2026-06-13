import { MAX_FOCUS_PAUSES } from "@/lib/constants";
import {
  activeDurationMinutesFromSession,
  computeStopwatchTimeBlockEndTime,
  finalizePausedTotalSeconds,
  type FocusSessionPauseFields,
} from "@/lib/focus-session-elapsed";
import { durationMinutes } from "@/lib/time";
import { validateFocusSessionTimeRange } from "@/lib/validation";
import { FocusConvertTransactionError } from "@/lib/actions/focus-shared";
import type { StopwatchCompleteInput } from "@/lib/actions/focus-shared";

export type PauseStopwatchWarning = "pause_remaining_one" | "pause_final";

export type FocusSegmentRow = {
  id: string;
  focusSessionId: string;
  userId: string;
  categoryId: string;
  startTime: Date;
  endTime: Date | null;
  durationMinutes: number | null;
};

export type FocusSegmentTransactionClient = {
  focusSegment: {
    create(args: {
      data: {
        focusSessionId: string;
        userId: string;
        categoryId: string;
        startTime: Date;
        endTime?: Date | null;
        durationMinutes?: number | null;
      };
    }): Promise<{ id: string }>;
    updateMany(args: {
      where: {
        focusSessionId: string;
        endTime: null;
      };
      data: {
        endTime: Date;
        durationMinutes: number;
      };
    }): Promise<{ count: number }>;
    findMany(args: {
      where: {
        focusSessionId: string;
        endTime: { not: null };
      };
      orderBy: { startTime: "asc" };
    }): Promise<FocusSegmentRow[]>;
    count(args: {
      where: { focusSessionId: string };
    }): Promise<number>;
    findFirst(args: {
      where: { focusSessionId: string; endTime: null };
      orderBy: { startTime: "desc" };
    }): Promise<FocusSegmentRow | null>;
  };
  focusSession: {
    create(args: {
      data: Record<string, unknown>;
    }): Promise<{ id: string }>;
    updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
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
        focusSegmentId?: string;
      };
    }): Promise<{ id: string }>;
  };
};

/** Minutes between segment wall-clock start and end (rounded, non-negative). */
export function segmentDurationMinutes(startTime: Date, endTime: Date): number {
  return Math.max(0, durationMinutes(startTime, endTime));
}

/**
 * Close the open segment with correct durationMinutes.
 * Returns whether an open segment was closed.
 */
export async function closeOpenFocusSegmentWithDuration(
  tx: FocusSegmentTransactionClient,
  focusSessionId: string,
  endTime: Date,
): Promise<boolean> {
  const open = await tx.focusSegment.findFirst({
    where: { focusSessionId, endTime: null },
    orderBy: { startTime: "desc" },
  });
  if (!open) {
    return false;
  }

  const mins = segmentDurationMinutes(open.startTime, endTime);
  await tx.focusSegment.updateMany({
    where: { focusSessionId, endTime: null },
    data: { endTime, durationMinutes: mins },
  });
  return true;
}

export async function createFocusSegment(
  tx: FocusSegmentTransactionClient,
  data: {
    focusSessionId: string;
    userId: string;
    categoryId: string;
    startTime: Date;
  },
): Promise<{ id: string }> {
  return tx.focusSegment.create({
    data: {
      focusSessionId: data.focusSessionId,
      userId: data.userId,
      categoryId: data.categoryId,
      startTime: data.startTime,
      endTime: null,
      durationMinutes: null,
    },
  });
}

export type PauseStopwatchSegmentResult =
  | { ok: true; warning: PauseStopwatchWarning }
  | { ok: false; reason: "pause_limit_exceeded" };

/**
 * Pause a running stopwatch: close current segment, increment pauseCount, or fail on 3rd attempt.
 */
export async function pauseStopwatchSegmentsInTransaction(
  session: {
    id: string;
    pauseCount: number;
  },
  pausedAt: Date,
  userId: string,
  tx: FocusSegmentTransactionClient,
): Promise<PauseStopwatchSegmentResult> {
  if (session.pauseCount >= MAX_FOCUS_PAUSES) {
    await closeOpenFocusSegmentWithDuration(tx, session.id, pausedAt);
    await tx.focusSession.updateMany({
      where: {
        id: session.id,
        status: "running",
        mode: "stopwatch",
        category: { userId },
      },
      data: {
        status: "failed",
        pausedAt: null,
      },
    });
    return { ok: false, reason: "pause_limit_exceeded" };
  }

  await closeOpenFocusSegmentWithDuration(tx, session.id, pausedAt);

  const newPauseCount = session.pauseCount + 1;

  const updated = await tx.focusSession.updateMany({
    where: {
      id: session.id,
      status: "running",
      mode: "stopwatch",
      pauseCount: session.pauseCount,
      category: { userId },
    },
    data: {
      status: "paused",
      pauseCount: newPauseCount,
      pausedAt,
    },
  });

  if (updated.count === 0) {
    throw new FocusConvertTransactionError("invalid_state");
  }

  const warning: PauseStopwatchWarning =
    newPauseCount === 1 ? "pause_remaining_one" : "pause_final";

  return { ok: true, warning };
}

export async function resumeStopwatchSegmentsInTransaction(
  session: FocusSessionPauseFields & {
    id: string;
    categoryId: string;
    userId: string;
  },
  now: Date,
  userId: string,
  tx: FocusSegmentTransactionClient,
): Promise<void> {
  const pausedAtMs = session.pausedAt?.getTime() ?? now.getTime();
  const segmentSeconds = Math.max(
    0,
    Math.floor((now.getTime() - pausedAtMs) / 1000),
  );
  const pausedTotalSeconds =
    Math.max(0, session.pausedTotalSeconds) + segmentSeconds;

  const updated = await tx.focusSession.updateMany({
    where: {
      id: session.id,
      status: "paused",
      mode: "stopwatch",
      category: { userId },
    },
    data: {
      status: "running",
      pausedAt: null,
      pausedTotalSeconds,
    },
  });

  if (updated.count === 0) {
    throw new FocusConvertTransactionError("invalid_state");
  }

  await createFocusSegment(tx, {
    focusSessionId: session.id,
    userId: session.userId,
    categoryId: session.categoryId,
    startTime: now,
  });
}

export const SEGMENT_NOTE_SUFFIX_ZH = "（来自分段专注会话）";
export const SEGMENT_NOTE_SUFFIX_EN = "(from segmented focus session)";

export function appendSegmentNote(
  baseNote: string | null,
  segmentIndex: number,
  totalSegments: number,
  localeNoteSuffix: string = SEGMENT_NOTE_SUFFIX_ZH,
): string | null {
  const suffix =
    totalSegments > 1
      ? `${localeNoteSuffix} ${segmentIndex}/${totalSegments}`
      : null;
  const trimmed = baseNote?.trim() ?? "";
  if (!trimmed && !suffix) {
    return null;
  }
  if (!suffix) {
    return trimmed || null;
  }
  if (!trimmed) {
    return suffix.trim();
  }
  return `${trimmed} ${suffix}`;
}

/**
 * Complete a stopwatch that has FocusSegments: one TimeBlock per closed segment.
 * TimeBlock startTime/endTime use wall-clock segment bounds.
 *
 * FocusSession.timeBlockId is set to the **first** created block for backward
 * compatibility only. Query all blocks via FocusSegment / TimeBlock.focusSegmentId.
 */
export async function completeStopwatchWithSegmentsInTransaction(
  session: {
    id: string;
    note: string | null;
    categoryId: string;
    status: string;
  },
  completeInput: StopwatchCompleteInput,
  wallClockEndTime: Date,
  userId: string,
  tx: FocusSegmentTransactionClient,
  options?: { segmentNoteSuffix?: string },
): Promise<{ timeBlockId: string; timeBlockIds: string[]; actualDurationMinutes: number }> {
  if (session.status === "failed" || session.status === "abandoned") {
    throw new FocusConvertTransactionError("invalid_state");
  }

  if (session.status === "running") {
    await closeOpenFocusSegmentWithDuration(tx, session.id, wallClockEndTime);
  }

  const segments = await tx.focusSegment.findMany({
    where: { focusSessionId: session.id, endTime: { not: null } },
    orderBy: { startTime: "asc" },
  });

  if (segments.length === 0) {
    throw new FocusConvertTransactionError("invalid_state");
  }

  const totalSegments = segments.length;
  let actualDurationMinutes = 0;
  const timeBlockIds: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment.endTime) {
      continue;
    }

    const rangeError = validateFocusSessionTimeRange(
      segment.startTime,
      segment.endTime,
    );
    if (rangeError) {
      throw new FocusConvertTransactionError("invalid_state");
    }

    const mins =
      segment.durationMinutes ??
      segmentDurationMinutes(segment.startTime, segment.endTime);
    actualDurationMinutes += mins;

    const block = await tx.timeBlock.create({
      data: {
        title: completeInput.title,
        note: appendSegmentNote(
          completeInput.note,
          i + 1,
          totalSegments,
          options?.segmentNoteSuffix,
        ),
        categoryId: session.categoryId,
        startTime: segment.startTime,
        endTime: segment.endTime,
        status: completeInput.status,
        completionLevel: completeInput.completionLevel,
        source: "stopwatch",
        focusSegmentId: segment.id,
      },
    });
    timeBlockIds.push(block.id);
  }

  if (timeBlockIds.length === 0) {
    throw new FocusConvertTransactionError("invalid_state");
  }

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
    },
  });

  if (claimed.count === 0) {
    throw new FocusConvertTransactionError("already_converted");
  }

  // Backward compatibility: link first block only. Full list via FocusSegment rows.
  await tx.focusSession.update({
    where: { id: session.id },
    data: { timeBlockId: timeBlockIds[0] },
  });

  return {
    timeBlockId: timeBlockIds[0],
    timeBlockIds,
    actualDurationMinutes,
  };
}

/** Legacy single-block completion when session has no FocusSegments. */
export async function completeStopwatchLegacyInTransaction(
  session: FocusSessionPauseFields & {
    id: string;
    note: string | null;
    categoryId: string;
    status: string;
  },
  completeInput: StopwatchCompleteInput,
  wallClockEndTime: Date,
  userId: string,
  tx: FocusSegmentTransactionClient,
): Promise<{ timeBlockId: string; actualDurationMinutes: number }> {
  if (session.status === "failed" || session.status === "abandoned") {
    throw new FocusConvertTransactionError("invalid_state");
  }

  const finalizedPausedTotal = finalizePausedTotalSeconds(
    session,
    wallClockEndTime,
  );
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

export async function cancelStopwatchSegmentsInTransaction(
  session: FocusSessionPauseFields & {
    id: string;
    status: string;
  },
  wallClockEndTime: Date,
  userId: string,
  tx: FocusSegmentTransactionClient,
): Promise<void> {
  if (session.status === "running") {
    await closeOpenFocusSegmentWithDuration(tx, session.id, wallClockEndTime);
  }

  const finalizedPausedTotal = finalizePausedTotalSeconds(
    session,
    wallClockEndTime,
  );
  const sessionForDuration: FocusSessionPauseFields = {
    startTime: session.startTime,
    status: "running",
    pausedAt: null,
    pausedTotalSeconds: finalizedPausedTotal,
  };
  const actualDurationMinutes = activeDurationMinutesFromSession(
    sessionForDuration,
    wallClockEndTime,
  );

  const updated = await tx.focusSession.updateMany({
    where: {
      id: session.id,
      status: { in: ["running", "paused"] },
      mode: "stopwatch",
      category: { userId },
    },
    data: {
      status: "abandoned",
      endTime: wallClockEndTime,
      actualDurationMinutes,
      pausedAt: null,
      pausedTotalSeconds: finalizedPausedTotal,
    },
  });

  if (updated.count === 0) {
    throw new FocusConvertTransactionError("invalid_state");
  }
}

export async function startStopwatchWithSegmentInTransaction(
  fields: {
    title: string | null;
    note: string | null;
    categoryId: string;
    startTime: Date;
    plannedDurationMinutes: number;
    status: string;
    mode: string;
    pauseCount: number;
    pausedTotalSeconds: number;
  },
  userId: string,
  tx: FocusSegmentTransactionClient,
): Promise<{ id: string }> {
  const session = await tx.focusSession.create({ data: fields });

  await createFocusSegment(tx, {
    focusSessionId: session.id,
    userId,
    categoryId: fields.categoryId,
    startTime: fields.startTime,
  });

  return session;
}
