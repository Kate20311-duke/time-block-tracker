"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarBlockEditPanel } from "@/components/calendar-block-edit-panel";
import type { CalendarEditBlockData } from "@/components/calendar-block-edit-panel";
import { CalendarDayGrid } from "@/components/calendar-day-grid";
import { CalendarWeekGrid } from "@/components/calendar-week-grid";
import type { WeekGridColumn } from "@/components/calendar-week-grid";
import type { CalendarGridBlock } from "@/components/calendar-day-grid";
import type { CalendarView } from "@/lib/calendar";
import type { Locale } from "@/lib/i18n/types";

type CategoryOption = { id: string; name: string };

type FormLabels = {
  panelAria: string;
  titleLabel: string;
  category: string;
  startTime: string;
  endTime: string;
  noteOptional: string;
  reviewNoteOptional: string;
  status: string;
  completionRange: string;
  efficiencyOptional: string;
  selectEfficiency: string;
  save: string;
  cancel: string;
  submitting: string;
};

type Props = {
  locale: Locale;
  view: CalendarView;
  calendarDate: string;
  selectedBlockId?: string;
  selectedBlock: CalendarEditBlockData | null;
  /** Remount edit form when server data changes (e.g. after save). */
  editPanelKey?: string;
  categories: CategoryOption[];
  statusOptions: { value: string; label: string }[];
  efficiencyOptions: { value: string; label: string }[];
  startTimeLocal: string;
  endTimeLocal: string;
  formLabels: FormLabels;
  dayBlocks?: CalendarGridBlock[];
  weekColumns?: WeekGridColumn[];
  notFoundMessage?: string;
  noCategoriesMessage?: string;
  dragSaveFailedMessage?: string;
};

function buildCalendarPath(
  date: string,
  view: CalendarView,
  blockId?: string,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams({ date });
  if (view === "day") {
    params.set("view", "day");
  }
  if (blockId) {
    params.set("blockId", blockId);
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value);
    }
  }
  return `/calendar?${params.toString()}`;
}

export function CalendarInteractiveView({
  locale,
  view,
  calendarDate,
  selectedBlockId,
  selectedBlock,
  editPanelKey,
  categories,
  statusOptions,
  efficiencyOptions,
  startTimeLocal,
  endTimeLocal,
  formLabels,
  dayBlocks,
  weekColumns,
  notFoundMessage,
  noCategoriesMessage,
  dragSaveFailedMessage,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dragError, setDragError] = useState<string | null>(null);

  const handleScheduleSaveEnd = useCallback(
    (ok: boolean) => {
      if (!ok && dragSaveFailedMessage) {
        setDragError(dragSaveFailedMessage);
      } else {
        setDragError(null);
      }
      router.refresh();
    },
    [router, dragSaveFailedMessage],
  );

  const handleBlockSelect = useCallback(
    (blockId: string) => {
      setDragError(null);
      const params = new URLSearchParams(searchParams.toString());
      params.set("date", calendarDate);
      if (view === "day") {
        params.set("view", "day");
      } else {
        params.delete("view");
      }
      params.set("blockId", blockId);
      params.delete("success");
      params.delete("error");
      router.push(`/calendar?${params.toString()}`);
    },
    [router, searchParams, calendarDate, view],
  );

  const handleCancel = useCallback(() => {
    router.push(buildCalendarPath(calendarDate, view));
  }, [router, calendarDate, view]);

  const showNotFound =
    Boolean(selectedBlockId) && !selectedBlock && notFoundMessage;

  return (
    <div className="space-y-6">
      {view === "week" && weekColumns ? (
        <CalendarWeekGrid
          locale={locale}
          columns={weekColumns}
          selectedBlockId={selectedBlockId}
          onBlockSelect={handleBlockSelect}
          onScheduleSaveEnd={handleScheduleSaveEnd}
        />
      ) : null}

      {dragError ? (
        <p className="text-sm text-amber-700" role="alert">
          {dragError}
        </p>
      ) : null}

      {view === "day" && dayBlocks ? (
        <CalendarDayGrid
          locale={locale}
          blocks={dayBlocks}
          selectedBlockId={selectedBlockId}
          calendarDate={calendarDate}
          onBlockSelect={handleBlockSelect}
          onScheduleSaveEnd={handleScheduleSaveEnd}
        />
      ) : null}

      {showNotFound ? (
        <p className="text-sm text-amber-700" role="alert">
          {notFoundMessage}
        </p>
      ) : null}

      {selectedBlock && categories.length > 0 ? (
        <CalendarBlockEditPanel
          key={editPanelKey ?? selectedBlock.id}
          block={selectedBlock}
          categories={categories}
          statusOptions={statusOptions}
          efficiencyOptions={efficiencyOptions}
          startTimeLocal={startTimeLocal}
          endTimeLocal={endTimeLocal}
          calendarDate={calendarDate}
          calendarView={view}
          labels={formLabels}
          onCancel={handleCancel}
        />
      ) : null}

      {selectedBlock && categories.length === 0 && noCategoriesMessage ? (
        <p className="text-sm text-amber-700" role="alert">
          {noCategoriesMessage}
        </p>
      ) : null}
    </div>
  );
}

/** Serialize server TimeBlock for the edit panel (dates as ISO strings). */
export function toCalendarEditBlockData(block: {
  id: string;
  title: string;
  note: string | null;
  reviewNote: string | null;
  categoryId: string;
  status: string;
  completionLevel: number;
  efficiencyLevel: string | null;
  startTime: Date;
  endTime: Date;
  category: { name: string; color: string };
}): CalendarEditBlockData {
  return {
    id: block.id,
    title: block.title,
    note: block.note,
    reviewNote: block.reviewNote,
    categoryId: block.categoryId,
    status: block.status,
    completionLevel: block.completionLevel,
    efficiencyLevel: block.efficiencyLevel,
    startTimeIso: block.startTime.toISOString(),
    endTimeIso: block.endTime.toISOString(),
    category: block.category,
  };
}
