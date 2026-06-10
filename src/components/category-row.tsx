"use client";

import { useState } from "react";
import { deleteCategory, updateCategory } from "@/lib/actions/categories";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

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
  confirmDeleteTitle: string;
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

  if (editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span
              className="h-8 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
              aria-hidden
            />
            <CardDescription>{category.name}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={updateCategory} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={category.id} />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{labels.name}</span>
              <Input name="name" required defaultValue={category.name} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{labels.color}</span>
              <Input
                name="color"
                type="color"
                defaultValue={category.color}
                className="h-9 w-16 cursor-pointer p-1"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">{labels.descriptionOptional}</span>
              <Textarea
                name="description"
                rows={2}
                defaultValue={category.description ?? ""}
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <SubmitButton
                label={labels.save}
                pendingLabel={labels.submitting}
                variant="secondary"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                {labels.cancel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start gap-3">
          <span
            className="mt-1 h-8 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{category.name}</p>
              <Badge variant="outline" className="tabular-nums">
                {labels.timeBlockCountFormatted}
              </Badge>
              {category.focusSessionCount > 0 ? (
                <Badge variant="secondary" className="tabular-nums">
                  {labels.focusSessionCountFormatted}
                </Badge>
              ) : null}
            </div>
            {category.description ? (
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
            ) : null}
            {labels.cannotDeleteFormatted ? (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  {labels.cannotDeleteFormatted}
                </p>
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              {labels.edit}
            </Button>
            <DeleteConfirmButton
              action={deleteCategory}
              id={category.id}
              confirmMessage={labels.confirmDelete}
              confirmTitle={labels.confirmDeleteTitle}
              cancelLabel={labels.cancel}
              deleteLabel={labels.delete}
              disabled={deleteDisabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
