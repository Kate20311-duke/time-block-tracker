import type { Locale } from "@/lib/i18n/types";
import type { RoutineGenerateSkipReason } from "@/lib/routines/routine-generate-types";
import type { RoutineGenerateListItem } from "@/lib/routines/routine-types";

export function isRoutineGenerateable(routine: RoutineGenerateListItem): boolean {
  return routine.isActive && Boolean(routine.categoryId);
}

export function getDefaultSelectedRoutineIds(
  routines: RoutineGenerateListItem[],
): string[] {
  return routines.filter(isRoutineGenerateable).map((routine) => routine.id);
}

export function pruneSelectedRoutineIds(
  selectedIds: Iterable<string>,
  routines: RoutineGenerateListItem[],
): Set<string> {
  const generateableIds = new Set(
    routines.filter(isRoutineGenerateable).map((routine) => routine.id),
  );
  return new Set([...selectedIds].filter((id) => generateableIds.has(id)));
}

export type GenerateButtonState =
  | "ready"
  | "generating"
  | "invalid_range"
  | "no_selection"
  | "no_matches";

export function resolveGenerateButtonState(params: {
  isGenerating: boolean;
  rangeValidationError: string | null;
  selectedCount: number;
  estimatedCount: number;
}): GenerateButtonState {
  if (params.isGenerating) {
    return "generating";
  }
  if (params.rangeValidationError) {
    return "invalid_range";
  }
  if (params.selectedCount === 0) {
    return "no_selection";
  }
  if (params.estimatedCount === 0) {
    return "no_matches";
  }
  return "ready";
}

export function canSubmitGenerate(state: GenerateButtonState): boolean {
  return state === "ready";
}

export function formatGenerateBlockLine(params: {
  date?: string;
  startTime: string;
  endTime: string;
  title: string;
  locale: Locale;
  timeZone: string;
}): string {
  const date =
    params.date ??
    new Intl.DateTimeFormat("en-CA", {
      timeZone: params.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(params.startTime));
  const timeFormatter = new Intl.DateTimeFormat(
    params.locale === "zh" ? "zh-CN" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: params.timeZone,
    },
  );
  const start = timeFormatter.format(new Date(params.startTime));
  const end = timeFormatter.format(new Date(params.endTime));
  return `${date} ${start}–${end} · ${params.title}`;
}

export function formatGenerateSkippedLine(params: {
  date: string;
  startTime?: string;
  endTime?: string;
  title: string;
  reasonLabel: string;
  locale: Locale;
  timeZone: string;
}): string {
  if (params.startTime && params.endTime) {
    return `${formatGenerateBlockLine({
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      title: params.title,
      locale: params.locale,
      timeZone: params.timeZone,
    })}：${params.reasonLabel}`;
  }
  return `${params.date} · ${params.title}：${params.reasonLabel}`;
}

export function skipReasonToLabelKey(
  reason: RoutineGenerateSkipReason,
): keyof Pick<
  import("@/lib/i18n/types").Dictionary["routines"]["generate"],
  | "skipDuplicate"
  | "skipConflictExisting"
  | "skipConflictBatch"
  | "skipMissingCategory"
  | "skipInvalidCategory"
> {
  switch (reason) {
    case "duplicate":
      return "skipDuplicate";
    case "conflict_existing":
      return "skipConflictExisting";
    case "conflict_batch":
      return "skipConflictBatch";
    case "missing_category":
      return "skipMissingCategory";
    case "invalid_category":
      return "skipInvalidCategory";
  }
}
