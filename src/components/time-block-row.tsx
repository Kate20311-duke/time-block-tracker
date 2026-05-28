"use client";

import { useState } from "react";
import { deleteTimeBlock, updateTimeBlock } from "@/lib/actions/time-blocks";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { SubmitButton } from "@/components/submit-button";

export type TimeBlockRowData = {
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
  category: { id: string; name: string; color: string };
};

type CategoryOption = { id: string; name: string };

type Labels = {
  titleLabel: string;
  category: string;
  startTime: string;
  endTime: string;
  noteOptional: string;
  status: string;
  completionRange: string;
  efficiencyOptional: string;
  selectEfficiency: string;
  reviewNoteOptional: string;
  durationFormatted: string;
  statusCompletionFormatted: string;
  startFormatted: string;
  endFormatted: string;
  confirmDelete: string;
  edit: string;
  save: string;
  cancel: string;
  delete: string;
  submitting: string;
};

type Props = {
  block: TimeBlockRowData;
  categories: CategoryOption[];
  statusOptions: { value: string; label: string }[];
  efficiencyOptions: { value: string; label: string }[];
  startTimeLocal: string;
  endTimeLocal: string;
  labels: Labels;
};

export function TimeBlockRow({
  block,
  categories,
  statusOptions,
  efficiencyOptions,
  startTimeLocal,
  endTimeLocal,
  labels,
}: Props) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <li className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-zinc-900">{block.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: block.category.color }}
              >
                {block.category.name}
              </span>
              <span className="text-zinc-400">·</span>
              <span>{labels.startFormatted}</span>
              <span>→</span>
              <span>{labels.endFormatted}</span>
              <span className="text-zinc-400">（{labels.durationFormatted}）</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {labels.statusCompletionFormatted}
            </p>
            {block.note ? (
              <p className="mt-1 text-sm text-zinc-600">{block.note}</p>
            ) : null}
            {block.reviewNote ? (
              <p className="mt-1 text-sm text-zinc-600">
                {block.reviewNote}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {labels.edit}
            </button>
            <DeleteConfirmButton
              action={deleteTimeBlock}
              id={block.id}
              confirmMessage={labels.confirmDelete}
              deleteLabel={labels.delete}
            />
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4">
      <form action={updateTimeBlock} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={block.id} />
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
            onClick={() => setEditing(false)}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            {labels.cancel}
          </button>
        </div>
      </form>
    </li>
  );
}
