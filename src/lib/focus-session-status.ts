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

export function isFocusSessionFailed(status: string): boolean {
  return status === "failed";
}

export function isFocusSessionAbandoned(status: string): boolean {
  return status === "abandoned";
}
