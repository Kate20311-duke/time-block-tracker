"use client";

import { updateTimeBlockFromCalendar } from "@/lib/actions/calendar-time-blocks";
import { SubmitButton } from "@/components/submit-button";

export type CalendarEditBlockData = {
  id: string;
  title: string;
  note: string | null;
  reviewNote: string | null;
  categoryId: string;
  status: string;
  completionLevel: number;
  efficiencyLevel: string | null;
  startTimeIso: string;
  endTimeIso: string;
  category: { name: string; color: string };
};

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
  block: CalendarEditBlockData;
  categories: CategoryOption[];
  statusOptions: { value: string; label: string }[];
  efficiencyOptions: { value: string; label: string }[];
  startTimeLocal: string;
  endTimeLocal: string;
  calendarDate: string;
  calendarView: "day" | "week";
  labels: FormLabels;
  onCancel: () => void;
};

export function CalendarBlockEditPanel({
  block,
  categories,
  statusOptions,
  efficiencyOptions,
  startTimeLocal,
  endTimeLocal,
  calendarDate,
  calendarView,
  labels,
  onCancel,
}: Props) {
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

      <form
        action={updateTimeBlockFromCalendar}
        className="grid gap-4 sm:grid-cols-2"
      >
        <input type="hidden" name="id" value={block.id} />
        <input type="hidden" name="calendarDate" value={calendarDate} />
        <input type="hidden" name="calendarView" value={calendarView} />
        <input type="hidden" name="calendarBlockId" value={block.id} />

        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">{labels.titleLabel}</span>
          <input
            name="title"
            required
            defaultValue={block.title}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.category}</span>
          <select
            name="categoryId"
            required
            defaultValue={block.categoryId}
            className="rounded border border-zinc-300 px-3 py-2"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.status}</span>
          <select
            name="status"
            required
            defaultValue={block.status}
            className="rounded border border-zinc-300 px-3 py-2"
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.startTime}</span>
          <input
            name="startTime"
            type="datetime-local"
            required
            defaultValue={startTimeLocal}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.endTime}</span>
          <input
            name="endTime"
            type="datetime-local"
            required
            defaultValue={endTimeLocal}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.completionRange}</span>
          <input
            name="completionLevel"
            type="number"
            min={0}
            max={100}
            step={1}
            required
            defaultValue={block.completionLevel}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.efficiencyOptional}</span>
          <select
            name="efficiencyLevel"
            defaultValue={block.efficiencyLevel ?? ""}
            className="rounded border border-zinc-300 px-3 py-2"
          >
            <option value="">{labels.selectEfficiency}</option>
            {efficiencyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">{labels.noteOptional}</span>
          <textarea
            name="note"
            rows={2}
            defaultValue={block.note ?? ""}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">{labels.reviewNoteOptional}</span>
          <textarea
            name="reviewNote"
            rows={2}
            defaultValue={block.reviewNote ?? ""}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <SubmitButton
            label={labels.save}
            pendingLabel={labels.submitting}
            variant="secondary"
          />
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            {labels.cancel}
          </button>
        </div>
      </form>
    </section>
  );
}
