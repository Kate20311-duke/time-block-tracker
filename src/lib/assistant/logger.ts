import "server-only";

function sanitizeError(error: unknown): { name?: string; message?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}

export function getUserIdSuffix(userId: string): string {
  return userId.length > 6 ? userId.slice(-6) : userId;
}

export function logAssistantError(
  event: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void {
  console.error(`[assistant] ${event}`, {
    ...meta,
    error: sanitizeError(error),
  });
}

export function logAssistantInfo(
  event: string,
  meta?: Record<string, unknown>,
): void {
  console.info(`[assistant] ${event}`, meta);
}
