import { enforceAssistantRateLimit } from "@/lib/assistant/assistant-route";
import {
  assistantErrorResponse,
  assistantJsonResponse,
} from "@/lib/assistant/api-response";
import { handleGoalSuggestionsRequest } from "@/lib/assistant/goal-suggestions-handler";
import {
  getUserIdSuffix,
  logAssistantError,
  logAssistantInfo,
} from "@/lib/assistant/logger";
import { getLocale } from "@/lib/i18n/server";
import { ensureDbUser, getSessionUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

const ROUTE_PATH = "/api/assistant/goal-suggestions";

export async function POST() {
  const startedAt = Date.now();

  const user = await getSessionUser();
  if (!user) {
    return assistantErrorResponse({
      status: 401,
      error: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  try {
    const ensuredUser = await ensureDbUser(user);
    const rateLimited = enforceAssistantRateLimit(
      ensuredUser.id,
      "goal-suggestions",
      ROUTE_PATH,
    );
    if (rateLimited) return rateLimited;

    const [timeZone, locale] = await Promise.all([
      getUserCalendarTimeZone(),
      getLocale(),
    ]);

    const result = await handleGoalSuggestionsRequest({
      userId: ensuredUser.id,
      timeZone,
      locale,
    });

    if (!result.ok) {
      logAssistantError("assistant.goal_suggestions.error", new Error("internal"), {
        route: ROUTE_PATH,
        durationMs: Date.now() - startedAt,
        userIdSuffix: getUserIdSuffix(ensuredUser.id),
      });
      return assistantErrorResponse({
        status: 500,
        error: "INTERNAL_ERROR",
        message: "Failed to generate goal suggestions",
      });
    }

    const event =
      result.data.source === "fallback"
        ? "assistant.goal_suggestions.fallback"
        : "assistant.goal_suggestions.success";

    logAssistantInfo(event, {
      route: ROUTE_PATH,
      source: result.data.source,
      durationMs: Date.now() - startedAt,
      userIdSuffix: getUserIdSuffix(ensuredUser.id),
      suggestionCount: result.data.suggestions.length,
    });

    return assistantJsonResponse(result.data);
  } catch (error) {
    logAssistantError("assistant.goal_suggestions.error", error, {
      route: ROUTE_PATH,
      durationMs: Date.now() - startedAt,
    });
    return assistantErrorResponse({
      status: 500,
      error: "INTERNAL_ERROR",
      message: "Failed to generate goal suggestions",
    });
  }
}
