"use client";

import { useEffect, useState } from "react";
import { computeFocusSessionElapsedSeconds } from "@/lib/focus-session-elapsed";
import { formatStopwatchElapsed } from "@/lib/focus";

type Props = {
  startTimeIso: string;
  pausedAtIso?: string | null;
  pausedTotalSeconds?: number;
  isPaused?: boolean;
  ariaLabel: string;
  className?: string;
};

/** Live HH:MM:SS elapsed display; no server writes. Pause-aware for stopwatch. */
export function ElapsedTimer({
  startTimeIso,
  pausedAtIso = null,
  pausedTotalSeconds = 0,
  isPaused = false,
  ariaLabel,
  className,
}: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startTime = new Date(startTimeIso);
    if (Number.isNaN(startTime.getTime())) {
      return;
    }

    const session = {
      startTime,
      status: isPaused ? "paused" : "running",
      pausedAt: pausedAtIso ? new Date(pausedAtIso) : null,
      pausedTotalSeconds,
    };

    const tick = () => {
      setElapsedSeconds(
        computeFocusSessionElapsedSeconds(session, isPaused ? undefined : new Date()),
      );
    };

    tick();
    if (isPaused) {
      return;
    }

    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [startTimeIso, pausedAtIso, pausedTotalSeconds, isPaused]);

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={ariaLabel}
      className={className}
    >
      {formatStopwatchElapsed(elapsedSeconds)}
    </div>
  );
}
