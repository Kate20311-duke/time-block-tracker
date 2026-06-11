import { NextResponse } from "next/server";

import {
  generateRoutineTimeBlocks,
  RoutineGenerateError,
} from "@/lib/routines/routine-generate.service";
import type { RoutineGenerateInput } from "@/lib/routines/routine-generate-types";
import { ensureDbUser, getSessionUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

type RequestBody = Partial<RoutineGenerateInput>;

function errorResponse(
  status: number,
  error: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error, message }, { status });
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

  const startDate = String(body.startDate ?? "").trim();
  const endDate = String(body.endDate ?? "").trim();
  if (!startDate || !endDate) {
    return errorResponse(400, "INVALID_INPUT", "startDate and endDate are required");
  }

  const routineIds = Array.isArray(body.routineIds)
    ? body.routineIds.map((id) => String(id).trim()).filter(Boolean)
    : undefined;

  try {
    const ensuredUser = await ensureDbUser(user);
    const timeZone = await getUserCalendarTimeZone();

    const result = await generateRoutineTimeBlocks({
      userId: ensuredUser.id,
      timeZone,
      input: { startDate, endDate, routineIds },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RoutineGenerateError) {
      const errorCode =
        error.code === "invalid_routine_ids"
          ? "INVALID_INPUT"
          : error.code.toUpperCase();
      return errorResponse(400, errorCode, error.code);
    }
    return errorResponse(500, "INTERNAL_ERROR", "Generation failed");
  }
}
