import "server-only";

import { timeBlocksForUser } from "@/lib/db/scoped";
import {
  buildTimeBlockOverlapWhere,
  parseExportDateRange,
  type ParseExportDateRangeError,
} from "@/lib/export/time-block-query";
import {
  mapBlocksToExportRows,
  type TimeBlockExportRow,
} from "@/lib/export/time-block-rows";

export type LoadTimeBlockExportResult =
  | {
      ok: true;
      rows: TimeBlockExportRow[];
      fromParam: string;
      toParam: string;
    }
  | { ok: false; error: ParseExportDateRangeError };

export async function loadTimeBlockExportData(params: {
  userId: string;
  from: string | null | undefined;
  to: string | null | undefined;
  timeZone: string;
}): Promise<LoadTimeBlockExportResult> {
  const parsed = parseExportDateRange(params.from, params.to, params.timeZone);

  if (!parsed.ok) {
    return parsed;
  }

  const { fromParam, toParam, rangeStart, rangeEnd } = parsed.range;

  const blocks = await timeBlocksForUser(params.userId, {
    where: buildTimeBlockOverlapWhere(rangeStart, rangeEnd),
    include: { category: true },
    orderBy: { startTime: "asc" },
  });

  return {
    ok: true,
    rows: mapBlocksToExportRows(blocks),
    fromParam,
    toParam,
  };
}
