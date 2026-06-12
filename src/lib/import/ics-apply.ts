import "server-only";

import { revalidatePath } from "next/cache";

import { assertCategoryOwned, timeBlocksForUser } from "@/lib/db/scoped";
import { isScopedAccessError } from "@/lib/db/scoped-errors";
import {
  evaluateIcsImportCheck,
  type ExistingTimeBlockForImportCheck,
} from "@/lib/import/duplicate-detection";
import type {
  IcsApplyInputEvent,
  IcsApplyResult,
  IcsApplySkipReason,
} from "@/lib/import/ics-apply-types";
import { ICS_APPLY_MAX_EVENTS } from "@/lib/import/ics-apply-types";
import {
  mapIcsEventToTimeBlockCreate,
  type IcsTimeBlockCreateData,
} from "@/lib/import/ics-to-time-blocks";
import type { IcsImportCheckStatus, ParsedIcsEvent } from "@/lib/import/ics-types";
import { prisma } from "@/lib/prisma";

function revalidateAfterIcsImport(): void {
  revalidatePath("/calendar");
  revalidatePath("/time-blocks");
  revalidatePath("/dashboard");
  revalidatePath("/review/day");
  revalidatePath("/review/week");
  revalidatePath("/settings");
}

function rangeBounds(blocks: IcsTimeBlockCreateData[]): {
  rangeStart: Date;
  rangeEnd: Date;
} | null {
  if (blocks.length === 0) {
    return null;
  }
  let min = blocks[0].startTime.getTime();
  let max = blocks[0].endTime.getTime();
  for (const block of blocks) {
    min = Math.min(min, block.startTime.getTime());
    max = Math.max(max, block.endTime.getTime());
  }
  return { rangeStart: new Date(min), rangeEnd: new Date(max) };
}

function emptyResult(): IcsApplyResult {
  return {
    importedCount: 0,
    skippedCount: 0,
    duplicateCount: 0,
    batchDuplicateCount: 0,
    conflictSkippedCount: 0,
    conflictImportedCount: 0,
    invalidCount: 0,
    unsupportedCount: 0,
    createdTimeBlockIds: [],
    skipped: [],
  };
}

function toParsedEvent(event: IcsApplyInputEvent): ParsedIcsEvent {
  return {
    id: event.id,
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: event.start,
    end: event.end,
    isAllDay: event.isAllDay,
    categories: [],
    status: event.status,
    warnings: [],
    unsupportedReasons: [],
  };
}

function incrementSkipCount(
  counts: Pick<
    IcsApplyResult,
    | "duplicateCount"
    | "batchDuplicateCount"
    | "conflictSkippedCount"
    | "invalidCount"
    | "unsupportedCount"
  >,
  reason: IcsApplySkipReason,
): void {
  switch (reason) {
    case "duplicate_exact":
      counts.duplicateCount += 1;
      break;
    case "batch_duplicate":
      counts.batchDuplicateCount += 1;
      break;
    case "conflict":
      counts.conflictSkippedCount += 1;
      break;
    case "not_supported":
    case "all_day":
      counts.unsupportedCount += 1;
      break;
    case "invalid_dates":
    case "invalid_range":
    case "invalid_title":
      counts.invalidCount += 1;
      break;
    default:
      break;
  }
}

export async function applyIcsImport(params: {
  userId: string;
  categoryId: string;
  events: IcsApplyInputEvent[];
  includeConflicts?: boolean;
}): Promise<IcsApplyResult> {
  const categoryId = params.categoryId.trim();
  if (!categoryId) {
    throw new Error("INVALID_CATEGORY");
  }

  try {
    await assertCategoryOwned(params.userId, categoryId);
  } catch (error) {
    if (isScopedAccessError(error)) {
      throw new Error("INVALID_CATEGORY");
    }
    throw error;
  }

  const includeConflicts = params.includeConflicts === true;
  const result = emptyResult();
  const inputEvents = Array.isArray(params.events) ? params.events : [];

  const mappable: Array<{ event: IcsApplyInputEvent; data: IcsTimeBlockCreateData }> =
    [];

  for (const [index, event] of inputEvents.entries()) {
    if (index >= ICS_APPLY_MAX_EVENTS) {
      result.skipped.push({
        id: event.id,
        summary: event.summary || `Event ${index + 1}`,
        reason: "batch_limit",
      });
      continue;
    }

    const mapped = mapIcsEventToTimeBlockCreate(event, categoryId);
    if (!mapped.ok) {
      result.skipped.push({
        id: event.id,
        summary: event.summary || "(No title)",
        reason: mapped.reason,
      });
      incrementSkipCount(result, mapped.reason);
      continue;
    }

    mappable.push({ event, data: mapped.data });
  }

  const bounds = rangeBounds(mappable.map((item) => item.data));
  const existingRows = bounds
    ? await timeBlocksForUser(params.userId, {
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
      })
    : [];

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

  const batchDuplicateKeys = new Set<string>();
  const accepted: IcsTimeBlockCreateData[] = [];

  for (const { event, data } of mappable) {
    const importCheck = evaluateIcsImportCheck({
      event: toParsedEvent(event),
      categoryId,
      existingBlocks,
      batchDuplicateKeys,
    });

    if (importCheck.status === "ready") {
      accepted.push(data);
      continue;
    }

    if (importCheck.status === "conflict" && includeConflicts) {
      accepted.push(data);
      result.conflictImportedCount += 1;
      continue;
    }

    const reason = mapImportCheckToSkipReason(importCheck.status);
    result.skipped.push({
      id: event.id,
      summary: event.summary || data.title,
      reason,
    });
    incrementSkipCount(result, reason);
  }

  result.skippedCount = result.skipped.length;

  if (accepted.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const data of accepted) {
        const created = await tx.timeBlock.create({
          data,
          select: { id: true },
        });
        result.createdTimeBlockIds.push(created.id);
      }
    });

    revalidateAfterIcsImport();
  }

  result.importedCount = result.createdTimeBlockIds.length;
  return result;
}

function mapImportCheckToSkipReason(
  status: IcsImportCheckStatus,
): IcsApplySkipReason {
  switch (status) {
    case "duplicate":
      return "duplicate_exact";
    case "batch_duplicate":
      return "batch_duplicate";
    case "conflict":
      return "conflict";
    case "unsupported":
      return "not_supported";
    case "invalid":
      return "invalid_dates";
    default:
      return "invalid_dates";
  }
}
