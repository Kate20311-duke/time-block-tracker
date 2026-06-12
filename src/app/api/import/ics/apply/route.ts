import { NextResponse } from "next/server";

import type { IcsApplyInputEvent } from "@/lib/import/ics-apply-types";
import { ICS_APPLY_MAX_EVENTS } from "@/lib/import/ics-apply-types";
import { applyIcsImport } from "@/lib/import/ics-apply";
import { ensureDbUser, getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type RequestBody = {
  categoryId?: string;
  events?: IcsApplyInputEvent[];
  includeConflicts?: boolean;
};

function errorResponse(
  status: number,
  error: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error, message }, { status });
}

function isApplyInputEvent(value: unknown): value is IcsApplyInputEvent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    typeof event.summary === "string" &&
    typeof event.start === "string" &&
    typeof event.end === "string" &&
    typeof event.isAllDay === "boolean" &&
    (event.status === "supported" ||
      event.status === "warning" ||
      event.status === "unsupported")
  );
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse(401, "UNAUTHORIZED", "Unauthorized");
  }

  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return errorResponse(400, "INVALID_INPUT", "Invalid request body");
  }

  const categoryId = String(body.categoryId ?? "").trim();
  if (!categoryId) {
    return errorResponse(400, "MISSING_CATEGORY", "categoryId is required");
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return errorResponse(400, "MISSING_EVENTS", "events array is required");
  }

  if (body.events.length > ICS_APPLY_MAX_EVENTS) {
    return errorResponse(
      400,
      "TOO_MANY_EVENTS",
      `At most ${ICS_APPLY_MAX_EVENTS} events per request`,
    );
  }

  const events = body.events.filter(isApplyInputEvent);
  if (events.length !== body.events.length) {
    return errorResponse(400, "INVALID_EVENTS", "Invalid event payload");
  }

  try {
    const ensuredUser = await ensureDbUser(user);
    const result = await applyIcsImport({
      userId: ensuredUser.id,
      categoryId,
      events,
      includeConflicts: body.includeConflicts === true,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CATEGORY") {
      return errorResponse(400, "INVALID_CATEGORY", "Invalid category");
    }
    return errorResponse(500, "IMPORT_FAILED", "Failed to import events");
  }
}
