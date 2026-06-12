import { NextResponse } from "next/server";

import { timeBlocksToCsv } from "@/lib/export/csv";
import { buildTimeBlocksExportFilename } from "@/lib/export/filenames";
import { loadTimeBlockExportData } from "@/lib/export/load-time-block-export";
import { ensureDbUser, getSessionUser } from "@/lib/session";
import { getUserCalendarTimeZone } from "@/lib/user-calendar-timezone.server";

export const dynamic = "force-dynamic";

function errorResponse(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse(401, "Unauthorized");
  }

  const ensuredUser = await ensureDbUser(user);
  const timeZone = await getUserCalendarTimeZone();

  const { searchParams } = new URL(request.url);
  const loaded = await loadTimeBlockExportData({
    userId: ensuredUser.id,
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    timeZone,
  });

  if (!loaded.ok) {
    return errorResponse(400, loaded.error);
  }

  const csv = timeBlocksToCsv(loaded.rows, timeZone);
  const filename = buildTimeBlocksExportFilename(
    loaded.fromParam,
    loaded.toParam,
    "csv",
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
