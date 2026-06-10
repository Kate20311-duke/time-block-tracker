"use client";

import { SubmitButton } from "@/components/submit-button";
import { TimeBlockDatetimeFields } from "@/components/time-block-datetime-fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TimeBlockFormCategory = { id: string; name: string };

export type TimeBlockFormValues = {
  id?: string;
  title?: string;
  categoryId?: string;
  status?: string;
  efficiencyLevel?: string | null;
  note?: string | null;
  reviewNote?: string | null;
  startTimeIso?: string;
  endTimeIso?: string;
};

export type TimeBlockFormLabels = {
  titleLabel: string;
  titlePlaceholder?: string;
  category: string;
  /** When set, create mode shows an empty category option with this label. */
  selectCategory?: string;
  startTime: string;
  endTime: string;
  noteOptional: string;
  notePlaceholder?: string;
  status: string;
  efficiencyOptional?: string;
  selectEfficiency?: string;
  reviewNoteOptional?: string;
  reviewNotePlaceholder?: string;
  save: string;
  cancel?: string;
  submitting: string;
};

type Props = {
  formId: string;
  action: (formData: FormData) => Promise<void>;
  mode: "create" | "edit";
  values?: TimeBlockFormValues;
  categories: TimeBlockFormCategory[];
  statusOptions: { value: string; label: string }[];
  efficiencyOptions?: { value: string; label: string }[];
  userTimeZone: string;
  labels: TimeBlockFormLabels;
  /** Extra hidden inputs (calendar context, calendarBlockId, etc.). */
  hiddenFields?: Record<string, string>;
  /** Show efficiency + reviewNote (list create/edit, calendar edit). */
  showEfficiencyAndReview?: boolean;
  autoFocusTitle?: boolean;
  gridClassName?: string;
  submitVariant?: "primary" | "secondary";
  /** Overrides labels.save (e.g. list create uses "Create"). */
  submitLabel?: string;
  onCancel?: () => void;
};

const SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

export function TimeBlockForm({
  formId,
  action,
  mode,
  values = {},
  categories,
  statusOptions,
  efficiencyOptions,
  userTimeZone,
  labels,
  hiddenFields,
  showEfficiencyAndReview = mode === "edit",
  autoFocusTitle = false,
  gridClassName = "grid gap-4 sm:grid-cols-2",
  submitVariant = "secondary",
  submitLabel,
  onCancel,
}: Props) {
  const showExtended = showEfficiencyAndReview && efficiencyOptions?.length;
  const showReview = showEfficiencyAndReview && labels.reviewNoteOptional;

  return (
    <form id={formId} action={action} className={gridClassName}>
      {mode === "edit" && values.id ? (
        <input type="hidden" name="id" value={values.id} />
      ) : null}
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}

      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">{labels.titleLabel}</span>
        <Input
          name="title"
          required
          autoFocus={autoFocusTitle}
          defaultValue={values.title ?? ""}
          placeholder={labels.titlePlaceholder}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{labels.category}</span>
        <select
          name="categoryId"
          required
          defaultValue={values.categoryId ?? ""}
          className={SELECT_CLASS}
        >
          {mode === "create" && labels.selectCategory ? (
            <option value="">{labels.selectCategory}</option>
          ) : null}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{labels.status}</span>
        <select
          name="status"
          required
          defaultValue={values.status ?? "planned"}
          className={SELECT_CLASS}
        >
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <TimeBlockDatetimeFields
        formId={formId}
        startLabel={labels.startTime}
        endLabel={labels.endTime}
        timeZone={userTimeZone}
        startTimeIso={values.startTimeIso}
        endTimeIso={values.endTimeIso}
      />

      {showExtended ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{labels.efficiencyOptional}</span>
          <select
            name="efficiencyLevel"
            defaultValue={values.efficiencyLevel ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">{labels.selectEfficiency}</option>
            {efficiencyOptions!.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">{labels.noteOptional}</span>
        <Textarea
          name="note"
          rows={2}
          defaultValue={values.note ?? ""}
          placeholder={labels.notePlaceholder}
        />
      </label>

      {showReview ? (
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">{labels.reviewNoteOptional}</span>
          <Textarea
            name="reviewNote"
            rows={2}
            defaultValue={values.reviewNote ?? ""}
            placeholder={labels.reviewNotePlaceholder}
          />
        </label>
      ) : null}

      <div className={cn("flex flex-wrap gap-2", "sm:col-span-2")}>
        <SubmitButton
          label={submitLabel ?? labels.save}
          pendingLabel={labels.submitting}
          variant={submitVariant}
        />
        {onCancel && labels.cancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {labels.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
