import type { IcsApplySkipReason } from "@/lib/import/ics-apply-types";
import {
  isExactImportDuplicate,
  normalizeImportTitle,
} from "@/lib/import/duplicate-detection";
import type { ParsedIcsEvent } from "@/lib/import/ics-types";

export const ICS_IMPORT_TIME_BLOCK_SOURCE = "ics_import" as const;

export type IcsTimeBlockCreateData = {
  title: string;
  note: string | null;
  categoryId: string;
  startTime: Date;
  endTime: Date;
  status: "planned";
  completionLevel: number;
  source: typeof ICS_IMPORT_TIME_BLOCK_SOURCE;
};

export type MapIcsEventResult =
  | { ok: true; data: IcsTimeBlockCreateData }
  | { ok: false; reason: IcsApplySkipReason };

/** Phase 4: only strictly supported, non-all-day timed events. */
export function isImportableIcsEvent(event: Pick<ParsedIcsEvent, "status" | "isAllDay" | "end">): boolean {
  return event.status === "supported" && !event.isAllDay && Boolean(event.end?.trim());
}

function parseTimedInstant(iso: string): Date | null {
  if (!iso.includes("T")) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildIcsImportNote(event: Pick<ParsedIcsEvent, "description" | "location">): string | null {
  const parts: string[] = [];
  const description = event.description?.trim();
  const location = event.location?.trim();

  if (description) {
    parts.push(description);
  }
  if (location) {
    parts.push(`Location: ${location}`);
  }

  const note = parts.join("\n\n");
  return note || null;
}

export function mapIcsEventToTimeBlockCreate(
  event: Pick<
    ParsedIcsEvent,
    "summary" | "description" | "location" | "start" | "end" | "isAllDay" | "status"
  >,
  categoryId: string,
): MapIcsEventResult {
  if (!isImportableIcsEvent(event)) {
    if (event.isAllDay) {
      return { ok: false, reason: "all_day" };
    }
    if (event.status !== "supported") {
      return { ok: false, reason: "not_supported" };
    }
    return { ok: false, reason: "invalid_dates" };
  }

  const startTime = parseTimedInstant(event.start);
  const endTime = parseTimedInstant(event.end);
  if (!startTime || !endTime) {
    return { ok: false, reason: "invalid_dates" };
  }
  if (endTime.getTime() <= startTime.getTime()) {
    return { ok: false, reason: "invalid_range" };
  }

  const title = normalizeImportTitle(event.summary);
  if (!title) {
    return { ok: false, reason: "invalid_title" };
  }

  return {
    ok: true,
    data: {
      title,
      note: buildIcsImportNote(event),
      categoryId,
      startTime,
      endTime,
      status: "planned",
      completionLevel: 0,
      source: ICS_IMPORT_TIME_BLOCK_SOURCE,
    },
  };
}

export function isExactTimeBlockDuplicate(
  candidate: Pick<IcsTimeBlockCreateData, "title" | "startTime" | "endTime" | "categoryId">,
  existing: Pick<
    { title: string; startTime: Date; endTime: Date; categoryId: string },
    "title" | "startTime" | "endTime" | "categoryId"
  >,
): boolean {
  return isExactImportDuplicate(
    {
      categoryId: candidate.categoryId,
      title: candidate.title,
      startMs: candidate.startTime.getTime(),
      endMs: candidate.endTime.getTime(),
    },
    {
      categoryId: existing.categoryId,
      title: existing.title,
      startMs: existing.startTime.getTime(),
      endMs: existing.endTime.getTime(),
    },
  );
}
