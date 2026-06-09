"use client";

import {
  deleteTimeBlockFromCalendar,
  updateTimeBlockFromCalendar,
} from "@/lib/actions/calendar-time-blocks";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import {
  TimeBlockForm,
  type TimeBlockFormLabels,
} from "@/components/time-block-form";
import type { CalendarEditBlockData } from "@/lib/calendar-edit";

export type { CalendarEditBlockData };

type CategoryOption = { id: string; name: string };

type PanelLabels = TimeBlockFormLabels & {
  panelAria: string;
  delete: string;
  confirmDelete: string;
};

type Props = {
  block: CalendarEditBlockData;
  categories: CategoryOption[];
  statusOptions: { value: string; label: string }[];
  efficiencyOptions: { value: string; label: string }[];
  userTimeZone: string;
  startTimeIso: string;
  endTimeIso: string;
  calendarDate: string;
  calendarView: "day" | "week";
  labels: PanelLabels;
  onCancel: () => void;
};

export function CalendarBlockEditPanel({
  block,
  categories,
  statusOptions,
  efficiencyOptions,
  userTimeZone,
  startTimeIso,
  endTimeIso,
  calendarDate,
  calendarView,
  labels,
  onCancel,
}: Props) {
  const formId = `calendar-block-edit-${block.id}`;

  return (
    <section
      aria-label={labels.panelAria}
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: block.category.color }}
            aria-hidden
          />
          <h2 className="truncate text-lg font-semibold text-zinc-900">
            {block.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          {labels.cancel}
        </button>
      </div>

      <TimeBlockForm
        formId={formId}
        action={updateTimeBlockFromCalendar}
        mode="edit"
        values={{
          id: block.id,
          title: block.title,
          categoryId: block.categoryId,
          status: block.status,
          efficiencyLevel: block.efficiencyLevel,
          note: block.note,
          reviewNote: block.reviewNote,
          startTimeIso,
          endTimeIso,
        }}
        categories={categories}
        statusOptions={statusOptions}
        efficiencyOptions={efficiencyOptions}
        userTimeZone={userTimeZone}
        labels={labels}
        hiddenFields={{
          calendarDate,
          calendarView,
          calendarBlockId: block.id,
        }}
        submitVariant="secondary"
        onCancel={onCancel}
      />

      <div className="mt-4 border-t border-zinc-100 pt-4">
        <DeleteConfirmButton
          action={deleteTimeBlockFromCalendar}
          id={block.id}
          confirmMessage={labels.confirmDelete}
          deleteLabel={labels.delete}
          extraFields={{
            calendarDate,
            calendarView,
          }}
        />
      </div>
    </section>
  );
}
