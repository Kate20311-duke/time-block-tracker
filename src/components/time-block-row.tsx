"use client";

import { useState } from "react";
import { deleteTimeBlock, updateTimeBlock } from "@/lib/actions/time-blocks";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import {
  TimeBlockForm,
  type TimeBlockFormLabels,
} from "@/components/time-block-form";
import { TimeBlockStatusBadge } from "@/components/time-blocks/time-block-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Locale } from "@/lib/i18n/types";

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
  dateFormatted: string;
  startFormatted: string;
  endFormatted: string;
  completion: string;
  confirmDelete: string;
  confirmDeleteTitle: string;
  edit: string;
  cancel: string;
  delete: string;
};

type Props = {
  block: TimeBlockRowData;
  categories: CategoryOption[];
  statusOptions: { value: string; label: string }[];
  efficiencyOptions: { value: string; label: string }[];
  userTimeZone: string;
  locale: Locale;
  labels: Labels;
};

export function TimeBlockRow({
  block,
  categories,
  statusOptions,
  efficiencyOptions,
  userTimeZone,
  locale,
  labels,
}: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>{block.title}</CardDescription>
        </CardHeader>
        <CardContent>
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
            gridClassName="grid gap-4 sm:grid-cols-2"
            submitVariant="secondary"
            onCancel={() => setEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="h-10 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: block.category.color }}
                aria-hidden
              />
              <span className="font-medium">{block.title}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-3">
              <Badge variant="outline">{block.category.name}</Badge>
              <TimeBlockStatusBadge
                status={block.status}
                completionLevel={block.completionLevel}
                locale={locale}
                completionLabel={labels.completion}
              />
              <Badge variant="outline" className="tabular-nums">
                {labels.durationFormatted}
              </Badge>
            </div>
            <p className="pl-3 text-sm text-muted-foreground">
              {labels.dateFormatted}
            </p>
            <p className="pl-3 text-sm text-muted-foreground">
              {labels.startFormatted} – {labels.endFormatted}
            </p>
            {block.note ? (
              <p className="pl-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {block.note}
              </p>
            ) : null}
            {block.reviewNote ? (
              <>
                <Separator className="ml-3" />
                <p className="pl-3 text-sm text-muted-foreground whitespace-pre-wrap">
                  {block.reviewNote}
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
              action={deleteTimeBlock}
              id={block.id}
              confirmMessage={labels.confirmDelete}
              confirmTitle={labels.confirmDeleteTitle}
              cancelLabel={labels.cancel}
              deleteLabel={labels.delete}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
