import "server-only";

import { assertCategoryOwned, timeBlocksForUser } from "@/lib/db/scoped";
import {
  annotateEventsWithImportCheck,
  type ExistingTimeBlockForImportCheck,
} from "@/lib/import/duplicate-detection";
import { mapIcsEventToTimeBlockCreate } from "@/lib/import/ics-to-time-blocks";
import type { ParsedIcsEvent } from "@/lib/import/ics-types";

function rangeBoundsFromEvents(
  events: ParsedIcsEvent[],
  categoryId: string,
): { rangeStart: Date; rangeEnd: Date } | null {
  let min: number | null = null;
  let max: number | null = null;

  for (const event of events) {
    const mapped = mapIcsEventToTimeBlockCreate(event, categoryId);
    if (!mapped.ok) {
      continue;
    }
    const startMs = mapped.data.startTime.getTime();
    const endMs = mapped.data.endTime.getTime();
    min = min === null ? startMs : Math.min(min, startMs);
    max = max === null ? endMs : Math.max(max, endMs);
  }

  if (min === null || max === null) {
    return null;
  }

  return { rangeStart: new Date(min), rangeEnd: new Date(max) };
}

export async function enrichIcsPreviewWithImportCheck(
  userId: string,
  categoryId: string,
  events: ParsedIcsEvent[],
): Promise<ParsedIcsEvent[]> {
  await assertCategoryOwned(userId, categoryId);

  const bounds = rangeBoundsFromEvents(events, categoryId);
  if (!bounds) {
    return annotateEventsWithImportCheck(events, categoryId, []);
  }

  const existingRows = await timeBlocksForUser(userId, {
    where: {
      startTime: { lt: bounds.rangeEnd },
      endTime: { gt: bounds.rangeStart },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      categoryId: true,
      category: { select: { name: true } },
    },
  });

  const existingBlocks: ExistingTimeBlockForImportCheck[] = existingRows.map(
    (row) => ({
      id: row.id,
      title: row.title,
      startTime: row.startTime,
      endTime: row.endTime,
      categoryId: row.categoryId,
      categoryName: row.category.name,
    }),
  );

  return annotateEventsWithImportCheck(events, categoryId, existingBlocks);
}
