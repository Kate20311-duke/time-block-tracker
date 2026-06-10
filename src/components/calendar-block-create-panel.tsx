"use client";

import { createTimeBlockFromCalendar } from "@/lib/actions/calendar-time-blocks";
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
    <Card aria-label={labels.panelAria}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{labels.heading}</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {labels.cancel}
        </Button>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
