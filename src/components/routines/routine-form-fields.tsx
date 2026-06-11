"use client";

import { RoutineDayPicker } from "@/components/routines/routine-day-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryOption } from "@/lib/routines/routine-types";
import type { Locale } from "@/lib/i18n/types";

export type RoutineFormDefaults = {
  title?: string;
  categoryId?: string | null;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  startDate?: string;
  endDate?: string | null;
  notes?: string | null;
};

type Props = {
  locale: Locale;
  categories: CategoryOption[];
  defaults?: RoutineFormDefaults;
  requireCategory?: boolean;
  labels: {
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
  };
};

export function RoutineFormFields({
  locale,
  categories,
  defaults,
  requireCategory = true,
  labels,
}: Props) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">{labels.title}</span>
        <Input
          name="title"
          required
          maxLength={100}
          placeholder={labels.titlePlaceholder}
          defaultValue={defaults?.title ?? ""}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">{labels.category}</span>
        <span className="text-xs text-muted-foreground">{labels.categoryHint}</span>
        <select
          name="categoryId"
          required={requireCategory}
          defaultValue={defaults?.categoryId ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="">{labels.selectCategory}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{labels.startTime}</span>
        <Input
          name="startTime"
          type="time"
          required
          defaultValue={defaults?.startTime ?? "09:00"}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{labels.endTime}</span>
        <Input
          name="endTime"
          type="time"
          required
          defaultValue={defaults?.endTime ?? "10:00"}
        />
      </label>
      <div className="sm:col-span-2">
        <RoutineDayPicker
          locale={locale}
          defaultDays={defaults?.daysOfWeek}
          labels={{
            repeatDays: labels.repeatDays,
            weekdays: labels.weekdays,
            everyday: labels.everyday,
            clear: labels.clear,
          }}
        />
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{labels.startDate}</span>
        <Input
          name="startDate"
          type="date"
          required
          defaultValue={defaults?.startDate}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{labels.endDate}</span>
        <Input
          name="endDate"
          type="date"
          defaultValue={defaults?.endDate ?? ""}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">{labels.notes}</span>
        <Textarea
          name="notes"
          rows={2}
          placeholder={labels.notesPlaceholder}
          defaultValue={defaults?.notes ?? ""}
        />
      </label>
    </>
  );
}
