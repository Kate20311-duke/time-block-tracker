"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarBlockCreatePanel } from "@/components/calendar-block-create-panel";
import { CalendarBlockEditPanel } from "@/components/calendar-block-edit-panel";
import type { CalendarEditBlockData } from "@/lib/calendar-edit";
import {
  resolveCalendarPanelMode,
  type CreateDraft,
} from "@/lib/calendar-panel-mode";
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
  efficiencyOptional: string;
  selectEfficiency: string;
  save: string;
  cancel: string;
  delete: string;
  confirmDelete: string;
  submitting: string;
};

type CreateFormLabels = {
  panelAria: string;
  heading: string;
  titleLabel: string;
  titlePlaceholder: string;
  category: string;
  selectCategory: string;
  startTime: string;
  endTime: string;
  noteOptional: string;
  status: string;
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
  userTimeZone: string;
  startTimeIso: string;
  endTimeIso: string;
  formLabels: FormLabels;
  createFormLabels: CreateFormLabels;
  emptySlotHintMessage?: string;
  dayBlocks?: CalendarGridBlock[];
  weekColumns?: WeekGridColumn[];
  notFoundMessage?: string;
  noCategoriesMessage?: string;
  dragSaveFailedMessage?: string;
  weekViewDragHintMessage?: string;
  continuedSegmentLabel: string;
  dragDisabledInWeekHint: string;
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
  userTimeZone,
  startTimeIso,
  endTimeIso,
  formLabels,
  createFormLabels,
  emptySlotHintMessage,
  dayBlocks,
  weekColumns,
  notFoundMessage,
  noCategoriesMessage,
  dragSaveFailedMessage,
  weekViewDragHintMessage,
  continuedSegmentLabel,
  dragDisabledInWeekHint,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dragError, setDragError] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);

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
      setCreateDraft(null);
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
    setCreateDraft(null);
    router.push(buildCalendarPath(calendarDate, view));
  }, [router, calendarDate, view]);

  const handleEmptySlotClick = useCallback(
    (startTimeIso: string, endTimeIso: string) => {
      setDragError(null);
      setCreateDraft({ startTimeIso, endTimeIso });
      router.push(buildCalendarPath(calendarDate, view));
    },
    [router, calendarDate, view],
  );

  const handleCancelCreate = useCallback(() => {
    setCreateDraft(null);
  }, []);

  const panelMode = resolveCalendarPanelMode(
    createDraft,
    selectedBlockId,
    selectedBlock,
  );

  const showNotFound =
    Boolean(selectedBlockId) && !selectedBlock && notFoundMessage;

  return (
    <div className="space-y-6">
      {view === "week" && weekColumns ? (
        <CalendarWeekGrid
          locale={locale}
          userTimeZone={userTimeZone}
          columns={weekColumns}
          selectedBlockId={selectedBlockId}
          continuedSegmentLabel={continuedSegmentLabel}
          dragDisabledHint={dragDisabledInWeekHint}
          onBlockSelect={handleBlockSelect}
          onScheduleSaveEnd={handleScheduleSaveEnd}
          onEmptySlotClick={handleEmptySlotClick}
        />
      ) : null}

      {view === "week" && weekViewDragHintMessage ? (
        <p className="text-sm text-zinc-500" role="note">
          {weekViewDragHintMessage}
        </p>
      ) : null}

      {dragError ? (
        <p className="text-sm text-amber-700" role="alert">
          {dragError}
        </p>
      ) : null}

      {view === "day" && dayBlocks ? (
        <CalendarDayGrid
          locale={locale}
          userTimeZone={userTimeZone}
          blocks={dayBlocks}
          selectedBlockId={selectedBlockId}
          calendarDate={calendarDate}
          continuedSegmentLabel={continuedSegmentLabel}
          onBlockSelect={handleBlockSelect}
          onScheduleSaveEnd={handleScheduleSaveEnd}
          onEmptySlotClick={handleEmptySlotClick}
        />
      ) : null}

      {emptySlotHintMessage ? (
        <p className="text-sm text-zinc-500" role="note">
          {emptySlotHintMessage}
        </p>
      ) : null}

      {showNotFound ? (
        <p className="text-sm text-amber-700" role="alert">
          {notFoundMessage}
        </p>
      ) : null}

      {panelMode === "edit" && selectedBlock && categories.length > 0 ? (
        <CalendarBlockEditPanel
          key={editPanelKey ?? selectedBlock.id}
          block={selectedBlock}
          categories={categories}
          statusOptions={statusOptions}
          efficiencyOptions={efficiencyOptions}
          userTimeZone={userTimeZone}
          startTimeIso={startTimeIso}
          endTimeIso={endTimeIso}
          calendarDate={calendarDate}
          calendarView={view}
          labels={formLabels}
          onCancel={handleCancel}
        />
      ) : null}

      {panelMode === "edit" &&
      selectedBlock &&
      categories.length === 0 &&
      noCategoriesMessage ? (
        <p className="text-sm text-amber-700" role="alert">
          {noCategoriesMessage}
        </p>
      ) : null}

      {panelMode === "create" && createDraft && categories.length > 0 ? (
        <CalendarBlockCreatePanel
          key={`${createDraft.startTimeIso}-${createDraft.endTimeIso}`}
          categories={categories}
          statusOptions={statusOptions}
          userTimeZone={userTimeZone}
          startTimeIso={createDraft.startTimeIso}
          endTimeIso={createDraft.endTimeIso}
          calendarDate={calendarDate}
          calendarView={view}
          labels={createFormLabels}
          onCancel={handleCancelCreate}
        />
      ) : null}

      {panelMode === "create" && createDraft && categories.length === 0 && noCategoriesMessage ? (
        <p className="text-sm text-amber-700" role="alert">
          {noCategoriesMessage}
        </p>
      ) : null}
    </div>
  );
}
