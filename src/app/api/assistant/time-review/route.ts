import { NextResponse } from "next/server";

import { handleTimeReviewRequest } from "@/lib/assistant/time-review-handler";
import { getLocale } from "@/lib/i18n/server";
import { ensureDbUser, getSessionUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

type RequestBody = {
  startDate?: string;
  endDate?: string;
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
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
      if (result.error.code === "internal") {
        return NextResponse.json(
          { error: "Failed to generate time review" },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: "Invalid date range", code: result.error.code },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[assistant/time-review]", error);
    return NextResponse.json(
      { error: "Failed to generate time review" },
      { status: 500 },
    );
  }
}
