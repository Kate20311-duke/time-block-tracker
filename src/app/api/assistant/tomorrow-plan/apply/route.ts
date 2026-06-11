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
import { applyTomorrowPlanBlocks } from "@/lib/assistant/tomorrow-plan-apply";
import type { TomorrowPlanApplyInputBlock } from "@/lib/assistant/tomorrow-plan-apply-types";
import { MAX_APPLY_BLOCKS } from "@/lib/assistant/tomorrow-plan-apply-types";
import { ensureDbUser, getSessionUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

const ROUTE_PATH = "/api/assistant/tomorrow-plan/apply";

type RequestBody = {
  blocks?: TomorrowPlanApplyInputBlock[];
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

  if (!Array.isArray(body.blocks) || body.blocks.length === 0) {
    return assistantErrorResponse({
      status: 400,
      error: "INVALID_INPUT",
      message: "No blocks to apply",
    });
  }

  if (body.blocks.length > MAX_APPLY_BLOCKS) {
    return assistantErrorResponse({
      status: 400,
      error: "INVALID_INPUT",
      message: `At most ${MAX_APPLY_BLOCKS} blocks per request`,
    });
  }

  try {
    const ensuredUser = await ensureDbUser(user);
    const rateLimited = enforceAssistantRateLimit(
      ensuredUser.id,
      "tomorrow-plan/apply",
      ROUTE_PATH,
    );
    if (rateLimited) return rateLimited;

    const timeZone = await getUserCalendarTimeZone();

    const result = await applyTomorrowPlanBlocks({
      userId: ensuredUser.id,
      timeZone,
      blocks: body.blocks,
    });

    logAssistantInfo("assistant.tomorrow_plan_apply.success", {
      route: ROUTE_PATH,
      durationMs: Date.now() - startedAt,
      userIdSuffix: getUserIdSuffix(ensuredUser.id),
      blockCount: body.blocks.length,
      createdCount: result.createdCount,
      skippedCount: result.skippedCount,
    });

    return assistantJsonResponse(result);
  } catch (error) {
    logAssistantError("assistant.tomorrow_plan_apply.error", error, {
      route: ROUTE_PATH,
      durationMs: Date.now() - startedAt,
      blockCount: body.blocks?.length ?? 0,
    });
    return assistantErrorResponse({
      status: 500,
      error: "INTERNAL_ERROR",
      message: "Failed to apply tomorrow plan",
    });
  }
}
