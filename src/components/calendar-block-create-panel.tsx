"use client";

import { createTimeBlockFromCalendar } from "@/lib/actions/calendar-time-blocks";
import {
  TimeBlockForm,
  type TimeBlockFormLabels,
} from "@/components/time-block-form";

type CategoryOption = { id: string; name: string };

type PanelLabels = TimeBlockFormLabels & {
  panelAria: string;
  heading: string;
};

type Props = {
  categories: CategoryOption[];
  statusOptions: { value: string; label: string }[];
  userTimeZone: string;
  startTimeIso: string;
  endTimeIso: string;
  calendarDate: string;
  calendarView: "day" | "week";
  labels: PanelLabels;
  onCancel: () => void;
};

export function CalendarBlockCreatePanel({
  categories,
  statusOptions,
  userTimeZone,
  startTimeIso,
  endTimeIso,
  calendarDate,
  calendarView,
  labels,
  onCancel,
}: Props) {
  const formId = "calendar-block-create";

  return (
    <section
      aria-label={labels.panelAria}
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">{labels.heading}</h2>
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
        action={createTimeBlockFromCalendar}
        mode="create"
        values={{ startTimeIso, endTimeIso }}
        categories={categories}
        statusOptions={statusOptions}
        userTimeZone={userTimeZone}
        labels={labels}
        hiddenFields={{
          calendarDate,
          calendarView,
        }}
        showEfficiencyAndReview={false}
        autoFocusTitle
        submitVariant="secondary"
        onCancel={onCancel}
      />
    </section>
  );
}
