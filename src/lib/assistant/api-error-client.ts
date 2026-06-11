import type { AssistantApiErrorCode } from "@/lib/assistant/api-response";
import type { Dictionary } from "@/lib/i18n/types";

export type AssistantApiErrorBody = {
  error?: AssistantApiErrorCode | string;
  message?: string;
  resetAt?: number;
};

export function resolveAssistantApiErrorMessage(
  body: AssistantApiErrorBody | null | undefined,
  labels: Dictionary["assistant"],
  fallback: string,
): string {
  switch (body?.error) {
    case "RATE_LIMITED":
      return labels.errorRateLimited;
    case "INVALID_INPUT":
      return body.message?.trim() || labels.errorInvalidInput;
    case "UNAUTHORIZED":
      return labels.errorUnauthorized;
    case "INTERNAL_ERROR":
      return fallback;
    default:
      return body?.message?.trim() || fallback;
  }
}

export async function readAssistantApiError(
  response: Response,
  labels: Dictionary["assistant"],
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as AssistantApiErrorBody;
    return resolveAssistantApiErrorMessage(body, labels, fallback);
  } catch {
    return fallback;
  }
}
