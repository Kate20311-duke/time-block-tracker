"use client";

import { useState } from "react";
import { deleteTimeBlock, updateTimeBlock } from "@/lib/actions/time-blocks";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import {
  TimeBlockForm,
  type TimeBlockFormLabels,
} from "@/components/time-block-form";

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

type Labels = TimeBlockFormLabels & {
  durationFormatted: string;
  statusCompletionFormatted: string;
  startFormatted: string;
  endFormatted: string;
  confirmDelete: string;
  edit: string;
  delete: string;
};

type Props = {
  block: TimeBlockRowData;
  categories: CategoryOption[];
  statusOptions: { value: string; label: string }[];
  efficiencyOptions: { value: string; label: string }[];
  userTimeZone: string;
  labels: Labels;
};

export function TimeBlockRow({
  block,
  categories,
  statusOptions,
  efficiencyOptions,
  userTimeZone,
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
      <TimeBlockForm
        formId={`time-block-edit-${block.id}`}
        action={updateTimeBlock}
        mode="edit"
        values={{
          id: block.id,
          title: block.title,
          categoryId: block.categoryId,
          status: block.status,
          efficiencyLevel: block.efficiencyLevel,
          note: block.note,
          reviewNote: block.reviewNote,
          startTimeIso: block.startTime.toISOString(),
          endTimeIso: block.endTime.toISOString(),
        }}
        categories={categories}
        statusOptions={statusOptions}
        efficiencyOptions={efficiencyOptions}
        userTimeZone={userTimeZone}
        labels={labels}
        gridClassName="grid gap-3 sm:grid-cols-2"
        submitVariant="secondary"
        onCancel={() => setEditing(false)}
      />
    </li>
  );
}
