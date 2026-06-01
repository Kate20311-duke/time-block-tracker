"use client";

import { useState } from "react";
import { deleteCategory, updateCategory } from "@/lib/actions/categories";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { SubmitButton } from "@/components/submit-button";

export type CategoryRowData = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  timeBlockCount: number;
  focusSessionCount: number;
};

type Labels = {
  name: string;
  color: string;
  descriptionOptional: string;
  timeBlockCountFormatted: string;
  focusSessionCountFormatted: string;
  cannotDeleteFormatted: string | null;
  confirmDelete: string;
  edit: string;
  save: string;
  cancel: string;
  delete: string;
  submitting: string;
};

type Props = {
  category: CategoryRowData;
  labels: Labels;
};

export function CategoryRow({ category, labels }: Props) {
  const [editing, setEditing] = useState(false);
  const deleteDisabled = labels.cannotDeleteFormatted !== null;

  if (!editing) {
    return (
      <li className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-start gap-3">
          <span
            className="mt-1 h-4 w-4 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-900">{category.name}</p>
            {category.description ? (
              <p className="mt-1 text-sm text-zinc-600">{category.description}</p>
            ) : null}
            <p className="mt-1 text-xs text-zinc-400">
              {category.color} · {labels.timeBlockCountFormatted}
              {category.focusSessionCount > 0
                ? ` · ${labels.focusSessionCountFormatted}`
                : ""}
            </p>
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
              action={deleteCategory}
              id={category.id}
              confirmMessage={labels.confirmDelete}
              deleteLabel={labels.delete}
              disabled={deleteDisabled}
            />
          </div>
        </div>
        {labels.cannotDeleteFormatted ? (
          <p className="mt-2 text-sm text-zinc-500">
            {labels.cannotDeleteFormatted}
          </p>
        ) : null}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4">
      <form
        action={updateCategory}
        className="grid gap-3 sm:grid-cols-2"
      >
        <input type="hidden" name="id" value={category.id} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.name}</span>
          <input
            name="name"
            required
            defaultValue={category.name}
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{labels.color}</span>
          <input
            name="color"
            type="color"
            defaultValue={category.color}
            className="h-10 w-14 cursor-pointer rounded border border-zinc-300"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">{labels.descriptionOptional}</span>
          <textarea
            name="description"
            rows={2}
            defaultValue={category.description ?? ""}
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
