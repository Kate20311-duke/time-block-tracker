import "server-only";

import type { NextResponse } from "next/server";

import { assistantErrorResponse } from "@/lib/assistant/api-response";
import { getUserIdSuffix, logAssistantInfo } from "@/lib/assistant/logger";
import { checkAssistantRateLimit } from "@/lib/assistant/rate-limit";

export const ASSISTANT_RATE_LIMITS = {
  "time-review": { limit: 10, windowMs: 10 * 60_000 },
  "weekly-review": { limit: 10, windowMs: 10 * 60_000 },
  "tomorrow-plan": { limit: 8, windowMs: 10 * 60_000 },
  "tomorrow-plan/apply": { limit: 20, windowMs: 10 * 60_000 },
} as const;

export type AssistantRouteName = keyof typeof ASSISTANT_RATE_LIMITS;

export function enforceAssistantRateLimit(
  userId: string,
  routeName: AssistantRouteName,
  routePath: string,
): NextResponse | null {
  const config = ASSISTANT_RATE_LIMITS[routeName];
  const result = checkAssistantRateLimit({
    key: `${userId}:${routeName}`,
    limit: config.limit,
    windowMs: config.windowMs,
  });

  if (result.allowed) {
    return null;
  }

  logAssistantInfo("assistant.rate_limited", {
    route: routePath,
    userIdSuffix: getUserIdSuffix(userId),
    resetAt: result.resetAt,
  });

  return assistantErrorResponse({
    status: 429,
    error: "RATE_LIMITED",
    message: "请求过于频繁，请稍后再试。",
    resetAt: result.resetAt,
  });
}
