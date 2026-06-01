"use client";

import { useEffect, useState } from "react";
import { formatStopwatchElapsed } from "@/lib/focus";

type Props = {
  startTimeIso: string;
  ariaLabel: string;
  className?: string;
};

/** Live HH:MM:SS elapsed display; no server writes. */
export function ElapsedTimer({ startTimeIso, ariaLabel, className }: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startMs = new Date(startTimeIso).getTime();
    if (Number.isNaN(startMs)) {
      return;
    }

    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [startTimeIso]);

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
