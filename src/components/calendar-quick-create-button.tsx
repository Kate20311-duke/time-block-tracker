"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { defaultSlotTimesForDay } from "@/lib/calendar-slot-create";

type Props = {
  label: string;
  calendarDate: string;
  userTimeZone: string;
  disabled?: boolean;
  onCreate: (startTimeIso: string, endTimeIso: string) => void;
};

export function CalendarQuickCreateButton({
  label,
  calendarDate,
  userTimeZone,
  disabled = false,
  onCreate,
}: Props) {
  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled}
      onClick={() => {
        const slot = defaultSlotTimesForDay(calendarDate, userTimeZone);
        onCreate(slot.startTimeIso, slot.endTimeIso);
      }}
    >
      <Plus data-icon="inline-start" />
      {label}
    </Button>
  );
}
