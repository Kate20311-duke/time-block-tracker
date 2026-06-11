"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EVERYDAY_DAYS, WEEKDAY_DAYS } from "@/lib/routines/routine-validation";
import { getDayLabels } from "@/lib/routines/routine-format";
import type { Locale } from "@/lib/i18n/types";

type Props = {
  locale: Locale;
  name?: string;
  defaultDays?: number[];
  labels: {
    repeatDays: string;
    weekdays: string;
    everyday: string;
    clear: string;
  };
};

export function RoutineDayPicker({
  locale,
  name = "daysOfWeek",
  defaultDays = WEEKDAY_DAYS,
  labels,
}: Props) {
  const [selected, setSelected] = useState<number[]>(defaultDays);
  const dayLabels = getDayLabels(locale);

  function toggleDay(day: number) {
    setSelected((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function setPreset(days: number[]) {
    setSelected(days);
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{labels.repeatDays}</span>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreset(WEEKDAY_DAYS)}
        >
          {labels.weekdays}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreset(EVERYDAY_DAYS)}
        >
          {labels.everyday}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreset([])}
        >
          {labels.clear}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {dayLabels.map((label, day) => {
          const checked = selected.includes(day);
          return (
            <label
              key={day}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
                checked
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggleDay(day)}
              />
              {label}
            </label>
          );
        })}
      </div>
      {selected.map((day) => (
        <input key={day} type="hidden" name={name} value={day} />
      ))}
    </div>
  );
}
