import { ICS_IMPORT_TITLE_MAX_LENGTH } from "@/lib/import/ics-apply-types";
import { mapIcsEventToTimeBlockCreate } from "@/lib/import/ics-to-time-blocks";
import type {
  IcsImportCheck,
  IcsImportCheckConflict,
  IcsImportCheckStatus,
  IcsImportCheckSummary,
  ParsedIcsEvent,
} from "@/lib/import/ics-types";

export type TimeIntervalMs = { startMs: number; endMs: number };

export type ExistingTimeBlockForImportCheck = {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  categoryId: string;
  categoryName: string;
};

export const ICS_IMPORT_CHECK_REASON = {
  unsupported: "unsupported",
  invalid: "invalid",
  duplicateExact: "duplicate_exact",
  batchDuplicate: "batch_duplicate",
  timeConflict: "time_conflict",
} as const;

/** Trim and collapse internal whitespace for duplicate comparison. */
export function normalizeImportTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").slice(0, ICS_IMPORT_TITLE_MAX_LENGTH);
}

export function intervalsOverlap(a: TimeIntervalMs, b: TimeIntervalMs): boolean {
  return a.startMs < b.endMs && a.endMs > b.startMs;
}

export function buildDuplicateKey(params: {
  categoryId: string;
  title: string;
  startMs: number;
  endMs: number;
}): string {
  return `${params.categoryId}|${normalizeImportTitle(params.title)}|${params.startMs}|${params.endMs}`;
}

export function isExactImportDuplicate(
  a: {
    categoryId: string;
    title: string;
    startMs: number;
    endMs: number;
  },
  b: {
    categoryId: string;
    title: string;
    startMs: number;
    endMs: number;
  },
): boolean {
  return (
    a.categoryId === b.categoryId &&
    normalizeImportTitle(a.title) === normalizeImportTitle(b.title) &&
    a.startMs === b.startMs &&
    a.endMs === b.endMs
  );
}

function toIntervalMs(startTime: Date, endTime: Date): TimeIntervalMs {
  return { startMs: startTime.getTime(), endMs: endTime.getTime() };
}

function findOverlappingConflicts(
  candidate: {
    categoryId: string;
    title: string;
    startTime: Date;
    endTime: Date;
  },
  existingBlocks: ExistingTimeBlockForImportCheck[],
): ExistingTimeBlockForImportCheck[] {
  const candidateMs = {
    categoryId: candidate.categoryId,
    title: candidate.title,
    startMs: candidate.startTime.getTime(),
    endMs: candidate.endTime.getTime(),
  };
  const interval = toIntervalMs(candidate.startTime, candidate.endTime);

  return existingBlocks.filter((block) => {
    if (
      isExactImportDuplicate(candidateMs, {
        categoryId: block.categoryId,
        title: block.title,
        startMs: block.startTime.getTime(),
        endMs: block.endTime.getTime(),
      })
    ) {
      return false;
    }
    return intervalsOverlap(interval, toIntervalMs(block.startTime, block.endTime));
  });
}

function toConflictInfo(block: ExistingTimeBlockForImportCheck): IcsImportCheckConflict {
  return {
    id: block.id,
    title: block.title,
    categoryName: block.categoryName,
    startTime: block.startTime.toISOString(),
    endTime: block.endTime.toISOString(),
  };
}

function buildImportCheck(
  status: IcsImportCheckStatus,
  reasons: string[],
  conflicts?: IcsImportCheckConflict[],
): IcsImportCheck {
  const canImport = status === "ready";

  return {
    status,
    canImport,
    reasons,
    ...(conflicts && conflicts.length > 0 ? { conflicts } : {}),
  };
}

/**
 * Priority: unsupported → invalid → duplicate → batch_duplicate → conflict → ready
 */
export function resolveImportCheckPriority(
  statuses: IcsImportCheckStatus[],
): IcsImportCheckStatus {
  const priority: IcsImportCheckStatus[] = [
    "unsupported",
    "invalid",
    "duplicate",
    "batch_duplicate",
    "conflict",
    "ready",
  ];
  for (const status of priority) {
    if (statuses.includes(status)) {
      return status;
    }
  }
  return "ready";
}

export function evaluateIcsImportCheck(params: {
  event: ParsedIcsEvent;
  categoryId: string;
  existingBlocks: ExistingTimeBlockForImportCheck[];
  batchDuplicateKeys: Set<string>;
}): IcsImportCheck {
  const { event, categoryId, existingBlocks, batchDuplicateKeys } = params;

  if (event.status === "unsupported") {
    return buildImportCheck("unsupported", [ICS_IMPORT_CHECK_REASON.unsupported]);
  }

  const mapped = mapIcsEventToTimeBlockCreate(event, categoryId);
  if (!mapped.ok) {
    if (mapped.reason === "not_supported") {
      return buildImportCheck("unsupported", [ICS_IMPORT_CHECK_REASON.unsupported]);
    }
    return buildImportCheck("invalid", [ICS_IMPORT_CHECK_REASON.invalid]);
  }

  const { data } = mapped;
  const duplicateKey = buildDuplicateKey({
    categoryId,
    title: data.title,
    startMs: data.startTime.getTime(),
    endMs: data.endTime.getTime(),
  });

  const candidateMs = {
    categoryId,
    title: data.title,
    startMs: data.startTime.getTime(),
    endMs: data.endTime.getTime(),
  };

  const exactInDb = existingBlocks.some((block) =>
    isExactImportDuplicate(candidateMs, {
      categoryId: block.categoryId,
      title: block.title,
      startMs: block.startTime.getTime(),
      endMs: block.endTime.getTime(),
    }),
  );
  if (exactInDb) {
    return buildImportCheck("duplicate", [ICS_IMPORT_CHECK_REASON.duplicateExact]);
  }

  if (batchDuplicateKeys.has(duplicateKey)) {
    return buildImportCheck("batch_duplicate", [
      ICS_IMPORT_CHECK_REASON.batchDuplicate,
    ]);
  }

  const conflicts = findOverlappingConflicts(data, existingBlocks);
  if (conflicts.length > 0) {
    batchDuplicateKeys.add(duplicateKey);
    return buildImportCheck(
      "conflict",
      [ICS_IMPORT_CHECK_REASON.timeConflict],
      conflicts.map(toConflictInfo),
    );
  }

  batchDuplicateKeys.add(duplicateKey);
  return buildImportCheck("ready", []);
}

export function annotateEventsWithImportCheck(
  events: ParsedIcsEvent[],
  categoryId: string,
  existingBlocks: ExistingTimeBlockForImportCheck[],
): ParsedIcsEvent[] {
  const batchDuplicateKeys = new Set<string>();

  return events.map((event) => ({
    ...event,
    importCheck: evaluateIcsImportCheck({
      event,
      categoryId,
      existingBlocks,
      batchDuplicateKeys,
    }),
  }));
}

export function summarizeImportChecks(
  events: ParsedIcsEvent[],
): IcsImportCheckSummary {
  const summary: IcsImportCheckSummary = {
    ready: 0,
    duplicate: 0,
    batch_duplicate: 0,
    conflict: 0,
    invalid: 0,
    unsupported: 0,
  };

  for (const event of events) {
    const status = event.importCheck?.status;
    if (!status) {
      continue;
    }
    summary[status] += 1;
  }

  return summary;
}

export function countImportableEvents(
  events: ParsedIcsEvent[],
  includeConflicts: boolean,
): number {
  return events.filter((event) => {
    const check = event.importCheck;
    if (!check) {
      return event.status === "supported";
    }
    if (check.status === "ready") {
      return true;
    }
    if (includeConflicts && check.status === "conflict") {
      return true;
    }
    return false;
  }).length;
}
