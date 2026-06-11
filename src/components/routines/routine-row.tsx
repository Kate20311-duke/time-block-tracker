"use client";

import { useState } from "react";
import {
  deleteRoutine,
  toggleRoutineActive,
  updateRoutine,
} from "@/lib/actions/routines";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { RoutineFormFields } from "@/components/routines/routine-form-fields";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMessage } from "@/lib/i18n";
import {
  formatDateOnly,
  formatDaysOfWeek,
  formatTimeRange,
} from "@/lib/routines/routine-format";
import {
  formatRoutineGeneratedStatus,
  type RoutineGeneratedStatus,
} from "@/lib/routines/routine-generated-status";
import type { CategoryOption, RoutineRowData } from "@/lib/routines/routine-types";
import type { Locale } from "@/lib/i18n/types";

type Labels = {
  edit: string;
  save: string;
  cancel: string;
  delete: string;
  submitting: string;
  confirmDelete: string;
  confirmDeleteTitle: string;
  activate: string;
  deactivate: string;
  active: string;
  inactive: string;
  noCategory: string;
  missingCategoryBadge: string;
  noEndDate: string;
  startLabel: string;
  statusLabel: string;
  notesLabel: string;
  editHeading: string;
  title: string;
  titlePlaceholder: string;
  category: string;
  categoryHint: string;
  selectCategory: string;
  startTime: string;
  endTime: string;
  repeatDays: string;
  weekdays: string;
  everyday: string;
  clear: string;
  startDate: string;
  endDate: string;
  notes: string;
  notesPlaceholder: string;
  generatedStatusAll: string;
  generatedStatusNone: string;
  generatedStatusPartial: string;
  generatedStatusNoDates: string;
  generatedStatusNote: string;
};

type Props = {
  routine: RoutineRowData;
  locale: Locale;
  categories: CategoryOption[];
  generatedStatus: RoutineGeneratedStatus | null;
  labels: Labels;
};

export function RoutineRow({
  routine,
  locale,
  categories,
  generatedStatus,
  labels,
}: Props) {
  const [editing, setEditing] = useState(false);

  const daysLabel = formatDaysOfWeek(routine.daysOfWeek, locale, {
    weekdays: labels.weekdays,
    everyday: labels.everyday,
  });
  const timeLabel = formatTimeRange(routine.startTime, routine.endTime);
  const categoryLabel = routine.categoryName ?? labels.noCategory;
  const missingCategory = !routine.categoryId;
  const startDate = new Date(`${routine.startDate}T00:00:00`);
  const endDate = routine.endDate
    ? new Date(`${routine.endDate}T00:00:00`)
    : null;
  const generatedStatusLabel =
    generatedStatus === null
      ? null
      : formatRoutineGeneratedStatus(
          generatedStatus,
          {
            all: labels.generatedStatusAll,
            none: labels.generatedStatusNone,
            partial: labels.generatedStatusPartial,
            noDates: labels.generatedStatusNoDates,
          },
          (existing, expected) =>
            formatMessage(labels.generatedStatusPartial, { existing, expected }),
        );

  if (editing) {
    return (
      <Card className={routine.isActive ? undefined : "opacity-80"}>
        <CardHeader className="pb-3">
          <CardDescription>{labels.editHeading}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateRoutine} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={routine.id} />
            <RoutineFormFields
              locale={locale}
              categories={categories}
              defaults={{
                title: routine.title,
                categoryId: routine.categoryId,
                startTime: routine.startTime,
                endTime: routine.endTime,
                daysOfWeek: routine.daysOfWeek,
                startDate: routine.startDate,
                endDate: routine.endDate,
                notes: routine.notes,
              }}
              labels={labels}
            />
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
    <Card className={routine.isActive ? undefined : "opacity-75"}>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start gap-3">
          {routine.categoryColor ? (
            <span
              className="mt-1 h-8 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: routine.categoryColor }}
              aria-hidden
            />
          ) : (
            <span
              className="mt-1 h-8 w-1 shrink-0 rounded-full bg-muted"
              aria-hidden
            />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{routine.title}</p>
              <Badge variant={routine.isActive ? "default" : "secondary"}>
                {routine.isActive ? labels.active : labels.inactive}
              </Badge>
              {missingCategory ? (
                <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                  {labels.missingCategoryBadge}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {categoryLabel} · {daysLabel} · {timeLabel}
            </p>
            <p className="text-sm text-muted-foreground">
              {labels.startLabel}
              {formatDateOnly(startDate, locale)}
              {" · "}
              {endDate
                ? formatDateOnly(endDate, locale)
                : labels.noEndDate}
            </p>
            {generatedStatusLabel ? (
              <p className="text-sm text-muted-foreground">
                {generatedStatusLabel}
                <span className="ml-1 text-xs">
                  （{labels.generatedStatusNote}）
                </span>
              </p>
            ) : null}
            {routine.notes ? (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  {labels.notesLabel}
                  {routine.notes}
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
            <form action={toggleRoutineActive}>
              <input type="hidden" name="id" value={routine.id} />
              <SubmitButton
                label={routine.isActive ? labels.deactivate : labels.activate}
                pendingLabel={labels.submitting}
                variant="secondary"
                className="h-8 px-3 text-sm"
              />
            </form>
            <DeleteConfirmButton
              action={deleteRoutine}
              id={routine.id}
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
