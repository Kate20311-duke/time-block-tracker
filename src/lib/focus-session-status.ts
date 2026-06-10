import type { FocusSessionStatus } from "@/lib/constants";

/** Statuses that block category deletion (must be cleared or abandoned first). */
export const FOCUS_SESSION_CATEGORY_BLOCKING_STATUSES = [
  "planned",
  "running",
  "paused",
  "completed",
  "converted",
] as const satisfies readonly FocusSessionStatus[];

export function isFocusSessionRunning(status: string): boolean {
  return status === "running";
}

export function isFocusSessionPaused(status: string): boolean {
  return status === "paused";
}

/** Running or paused — blocks starting another session. */
export function isFocusSessionActive(status: string): boolean {
  return status === "running" || status === "paused";
}

export function isFocusSessionPlanned(status: string): boolean {
  return status === "planned";
}

export function isFocusSessionAbandoned(status: string): boolean {
  return status === "abandoned";
}

/** Active = not terminal; blocks category delete together with completed/converted. */
export function blocksCategoryDeletionFocusStatus(status: string): boolean {
  return !isFocusSessionAbandoned(status);
}
