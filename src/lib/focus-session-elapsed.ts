export type FocusSessionPauseFields = {
  startTime: Date;
  status: string;
  pausedAt: Date | null;
  pausedTotalSeconds: number;
};

/**
 * Elapsed active seconds for a stopwatch session (excludes paused time).
 * When paused, frozen at pause moment; when running, counts to `now`.
 */
export function computeFocusSessionElapsedSeconds(
  session: FocusSessionPauseFields,
  now: Date = new Date(),
): number {
  const startMs = session.startTime.getTime();
  if (Number.isNaN(startMs)) {
    return 0;
  }

  const pausedTotal = Math.max(0, session.pausedTotalSeconds);

  if (session.status === "paused" && session.pausedAt) {
    const pausedAtMs = session.pausedAt.getTime();
    if (!Number.isNaN(pausedAtMs)) {
      return Math.max(
        0,
        Math.floor((pausedAtMs - startMs) / 1000) - pausedTotal,
      );
    }
  }

  const nowMs = now.getTime();
  return Math.max(0, Math.floor((nowMs - startMs) / 1000) - pausedTotal);
}

/** TimeBlock end instant: start + active duration (excludes pauses). */
export function computeStopwatchTimeBlockEndTime(
  session: FocusSessionPauseFields,
  now: Date = new Date(),
): Date {
  const activeSeconds = computeFocusSessionElapsedSeconds(session, now);
  return new Date(session.startTime.getTime() + activeSeconds * 1000);
}

/** Finalize pause fields if completing/cancelling while paused. */
export function finalizePausedTotalSeconds(
  session: FocusSessionPauseFields,
  now: Date = new Date(),
): number {
  if (session.status !== "paused" || !session.pausedAt) {
    return Math.max(0, session.pausedTotalSeconds);
  }
  const pausedAtMs = session.pausedAt.getTime();
  if (Number.isNaN(pausedAtMs)) {
    return Math.max(0, session.pausedTotalSeconds);
  }
  const segmentSeconds = Math.max(
    0,
    Math.floor((now.getTime() - pausedAtMs) / 1000),
  );
  return Math.max(0, session.pausedTotalSeconds) + segmentSeconds;
}

export function activeDurationMinutesFromSession(
  session: FocusSessionPauseFields,
  now: Date = new Date(),
): number {
  const seconds = computeFocusSessionElapsedSeconds(session, now);
  return Math.max(0, Math.round(seconds / 60));
}
