import { enforceAssistantRateLimit } from "@/lib/assistant/assistant-route";
import {
  assistantErrorResponse,
  assistantJsonResponse,
} from "@/lib/assistant/api-response";
import { handleTimeReviewRequest } from "@/lib/assistant/time-review-handler";
import {
  getUserIdSuffix,
  logAssistantError,
  logAssistantInfo,
} from "@/lib/assistant/logger";
import { getLocale } from "@/lib/i18n/server";
import { ensureDbUser, getSessionUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

const ROUTE_PATH = "/api/assistant/time-review";

type RequestBody = {
  startDate?: string;
  endDate?: string;
};

export async function POST(request: Request) {
  const startedAt = Date.now();

  const user = await getSessionUser();
  if (!user) {
    return assistantErrorResponse({
      status: 401,
      error: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    body = {};
  }

  try {
    const ensuredUser = await ensureDbUser(user);
    const rateLimited = enforceAssistantRateLimit(
      ensuredUser.id,
      "time-review",
      ROUTE_PATH,
    );
    if (rateLimited) return rateLimited;

    const [timeZone, locale] = await Promise.all([
      getUserCalendarTimeZone(),
      getLocale(),
    ]);

    const result = await handleTimeReviewRequest({
      userId: ensuredUser.id,
      timeZone,
      locale,
      startDate: body.startDate,
      endDate: body.endDate,
    });

    if (!result.ok) {
      if (result.error.code === "internal") {
        logAssistantError("assistant.time_review.error", new Error("internal"), {
          route: ROUTE_PATH,
          durationMs: Date.now() - startedAt,
          userIdSuffix: getUserIdSuffix(ensuredUser.id),
        });
        return assistantErrorResponse({
          status: 500,
          error: "INTERNAL_ERROR",
          message: "Failed to generate time review",
        });
      }

      return assistantErrorResponse({
        status: 400,
        error: "INVALID_INPUT",
        message: "Invalid date range",
      });
    }

    const event =
      result.data.source === "fallback"
        ? "assistant.time_review.fallback"
        : "assistant.time_review.success";

    logAssistantInfo(event, {
      route: ROUTE_PATH,
      source: result.data.source,
      durationMs: Date.now() - startedAt,
      userIdSuffix: getUserIdSuffix(ensuredUser.id),
      recordedDays: result.data.summary.dataQuality.recordedDays,
    });

    return assistantJsonResponse(result.data);
  } catch (error) {
    logAssistantError("assistant.time_review.error", error, {
      route: ROUTE_PATH,
      durationMs: Date.now() - startedAt,
    });
    return assistantErrorResponse({
      status: 500,
      error: "INTERNAL_ERROR",
      message: "Failed to generate time review",
    });
  }
}
