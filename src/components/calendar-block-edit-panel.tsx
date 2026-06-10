"use client";

import {
  deleteTimeBlockFromCalendar,
  updateTimeBlockFromCalendar,
} from "@/lib/actions/calendar-time-blocks";
import { CalendarBlockPanelSummary } from "@/components/calendar-block-panel-summary";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import {
  TimeBlockForm,
  type TimeBlockFormLabels,
} from "@/components/time-block-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CalendarEditBlockData } from "@/lib/calendar-edit";
import { durationMinutes } from "@/lib/time";
import type { Locale } from "@/lib/i18n/types";

export type { CalendarEditBlockData };

type CategoryOption = { id: string; name: string };

type PanelLabels = TimeBlockFormLabels & {
  panelAria: string;
  delete: string;
  confirmDelete: string;
  confirmDeleteTitle: string;
  completion: string;
  minutesUnit: string;
};

type Props = {
  block: CalendarEditBlockData;
  categories: CategoryOption[];
  statusOptions: { value: string; label: string }[];
  efficiencyOptions: { value: string; label: string }[];
  userTimeZone: string;
  locale: Locale;
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
  locale,
  startTimeIso,
  endTimeIso,
  calendarDate,
  calendarView,
  labels,
  onCancel,
}: Props) {
  const formId = `calendar-block-edit-${block.id}`;
  const minutes = durationMinutes(new Date(startTimeIso), new Date(endTimeIso));

  return (
    <Card aria-label={labels.panelAria}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{block.title}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {labels.cancel}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <CalendarBlockPanelSummary
          locale={locale}
          userTimeZone={userTimeZone}
          categoryName={block.category.name}
          categoryColor={block.category.color}
          startTimeIso={startTimeIso}
          endTimeIso={endTimeIso}
          status={block.status}
          completionLevel={block.completionLevel}
          completionLabel={labels.completion}
          durationLabel={`${minutes} ${labels.minutesUnit}`}
          note={block.note}
        />

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

        <Separator />

        <DeleteConfirmButton
          action={deleteTimeBlockFromCalendar}
          id={block.id}
          confirmMessage={labels.confirmDelete}
          confirmTitle={labels.confirmDeleteTitle}
          cancelLabel={labels.cancel ?? "Cancel"}
          deleteLabel={labels.delete}
          extraFields={{
            calendarDate,
            calendarView,
          }}
        />
      </CardContent>
    </Card>
  );
}
