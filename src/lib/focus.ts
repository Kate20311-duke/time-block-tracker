/** Common Pomodoro / focus duration presets (minutes). */
export const FOCUS_DURATION_PRESETS = [15, 25, 45, 50, 90] as const;

/** Format seconds as M:SS or H:MM:SS for the countdown display. */
export function formatFocusCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

/** Minutes to display for a focus session in history lists. */
export function focusSessionDisplayMinutes(session: {
  actualDurationMinutes: number | null;
  plannedDurationMinutes: number;
  startTime: Date;
  endTime: Date | null;
}): number {
  if (session.actualDurationMinutes != null) {
    return session.actualDurationMinutes;
  }
  if (session.endTime) {
    const ms = session.endTime.getTime() - session.startTime.getTime();
    return Math.max(0, Math.round(ms / 60_000));
  }
  return session.plannedDurationMinutes;
}

/** Parse a positive integer number of minutes from user input. */
export function parsePlannedFocusMinutes(value: string): number | null {
  const n = Number(value.trim());
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return Math.round(n);
}
