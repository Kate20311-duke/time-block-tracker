import { enforceAssistantRateLimit } from "@/lib/assistant/assistant-route";
import {
  assistantErrorResponse,
  assistantJsonResponse,
} from "@/lib/assistant/api-response";
import {
  getUserIdSuffix,
  logAssistantError,
  logAssistantInfo,
} from "@/lib/assistant/logger";
import { handleTomorrowPlanRequest } from "@/lib/assistant/tomorrow-plan-handler";
import { USER_GOAL_MAX_LENGTH } from "@/lib/assistant/tomorrow-plan-types";
import { getLocale } from "@/lib/i18n/server";
import { ensureDbUser, getSessionUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

const ROUTE_PATH = "/api/assistant/tomorrow-plan";

type RequestBody = {
  userGoal?: string;
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
    return assistantErrorResponse({
      status: 400,
      error: "INVALID_INPUT",
      message: "Invalid request body",
    });
  }

  const rawGoal = typeof body.userGoal === "string" ? body.userGoal.trim() : "";
  if (rawGoal.length > USER_GOAL_MAX_LENGTH) {
    return assistantErrorResponse({
      status: 400,
      error: "INVALID_INPUT",
      message: "目标内容过长，请控制在 500 字以内。",
    });
  }

  try {
    const ensuredUser = await ensureDbUser(user);
    const rateLimited = enforceAssistantRateLimit(
      ensuredUser.id,
      "tomorrow-plan",
      ROUTE_PATH,
    );
    if (rateLimited) return rateLimited;

    const [timeZone, locale] = await Promise.all([
      getUserCalendarTimeZone(),
      getLocale(),
    ]);

    const result = await handleTomorrowPlanRequest({
      userId: ensuredUser.id,
      timeZone,
      locale,
      userGoal: body.userGoal ?? "",
    });

    if (!result.ok) {
      if (result.error.code === "invalid_goal") {
        return assistantErrorResponse({
          status: 400,
          error: "INVALID_INPUT",
          message: "Invalid user goal",
        });
      }

      logAssistantError("assistant.tomorrow_plan.error", new Error("internal"), {
        route: ROUTE_PATH,
        durationMs: Date.now() - startedAt,
        userIdSuffix: getUserIdSuffix(ensuredUser.id),
        goalLength: rawGoal.length,
      });
      return assistantErrorResponse({
        status: 500,
        error: "INTERNAL_ERROR",
        message: "Failed to generate tomorrow plan",
      });
    }

    const event =
      result.data.source === "fallback"
        ? "assistant.tomorrow_plan.fallback"
        : "assistant.tomorrow_plan.success";

    logAssistantInfo(event, {
      route: ROUTE_PATH,
      source: result.data.source,
      durationMs: Date.now() - startedAt,
      userIdSuffix: getUserIdSuffix(ensuredUser.id),
      goalLength: rawGoal.length,
      blockCount: result.data.plan.suggestedBlocks.length,
    });

    return assistantJsonResponse(result.data);
  } catch (error) {
    logAssistantError("assistant.tomorrow_plan.error", error, {
      route: ROUTE_PATH,
      durationMs: Date.now() - startedAt,
      goalLength: rawGoal.length,
    });
    return assistantErrorResponse({
      status: 500,
      error: "INTERNAL_ERROR",
      message: "Failed to generate tomorrow plan",
    });
  }
}
