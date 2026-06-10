import { NextResponse } from "next/server";

import { handleTimeReviewRequest } from "@/lib/assistant/time-review-handler";
import { getLocale } from "@/lib/i18n/server";
import { ensureDbUser, getSessionUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

/**
 * @deprecated Prefer POST /api/assistant/time-review with optional startDate/endDate.
 * Kept for backward compatibility; defaults to last 7 days when body is empty.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { startDate?: string; endDate?: string } = {};
  try {
    body = (await request.json()) as { startDate?: string; endDate?: string };
  } catch {
    body = {};
  }

  try {
    const ensuredUser = await ensureDbUser(user);
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
      return NextResponse.json(
        { error: "Failed to generate weekly review" },
        { status: result.error.code === "internal" ? 500 : 400 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[assistant/weekly-review]", error);
    return NextResponse.json(
      { error: "Failed to generate weekly review" },
      { status: 500 },
    );
  }
}
