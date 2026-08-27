"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { TIME_BLOCK_STATUSES } from "@/lib/constants";
import { hasAvailableSaveCategories } from "@/lib/focus-category-display";
import type { Dictionary } from "@/lib/i18n/types";

export type StopwatchCompleteFormValues = {
  title: string;
  note: string;
  status: string;
  completionLevel: number;
  targetCategoryId?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues: StopwatchCompleteFormValues;
  labels: Pick<
    Dictionary["focus"],
    | "stopwatchCompleteDialogTitle"
    | "stopwatchCompleteDialogDescription"
    | "titleLabel"
    | "noteOptional"
    | "notePlaceholder"
    | "stopwatchEndAndSave"
    | "categoryRemovedSaveTitle"
    | "categoryRemovedSaveDescription"
    | "selectSaveCategory"
    | "selectCategory"
    | "finishAndSave"
    | "noAvailableCategories"
    | "createCategoryFirst"
    | "goToCategories"
    | "saving"
  > &
    Pick<Dictionary["timeBlocks"], "status" | "completionRange"> &
    Pick<Dictionary["common"], "cancel">;
  statusLabels: Dictionary["status"];
  onConfirm: (values: StopwatchCompleteFormValues) => void | Promise<void>;
  busy?: boolean;
  needsCategory?: boolean;
  categories?: { id: string; name: string }[];
};

export function StopwatchCompleteDialog({
  open,
  onOpenChange,
  defaultValues,
  labels,
  statusLabels,
  onConfirm,
  busy = false,
  needsCategory = false,
  categories = [],
}: Props) {
  const [title, setTitle] = useState(defaultValues.title);
  const [note, setNote] = useState(defaultValues.note);
  const [status, setStatus] = useState(defaultValues.status);
  const [completionLevel, setCompletionLevel] = useState(
    String(defaultValues.completionLevel),
  );
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const hasCategories = hasAvailableSaveCategories(categories);
  const dialogTitle = needsCategory
    ? labels.categoryRemovedSaveTitle
    : labels.stopwatchCompleteDialogTitle;
  const dialogDescription = needsCategory
    ? hasCategories
      ? labels.categoryRemovedSaveDescription
      : labels.createCategoryFirst
    : labels.stopwatchCompleteDialogDescription;
  const confirmDisabled =
    busy || (needsCategory && (!hasCategories || !targetCategoryId));

  const handleConfirm = async () => {
    if (needsCategory && !targetCategoryId) {
      return;
    }
    const level = Number(completionLevel);
    await onConfirm({
      title: title.trim() || defaultValues.title,
      note: note.trim(),
      status,
      completionLevel: Number.isNaN(level) ? defaultValues.completionLevel : level,
      targetCategoryId: needsCategory ? targetCategoryId : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {needsCategory && !hasCategories ? (
          <p className="text-sm text-muted-foreground">{labels.noAvailableCategories}</p>
        ) : (
          <div className="grid gap-4 py-2">
            {needsCategory ? (
              <div className="space-y-2">
                <label htmlFor="stopwatch-complete-category" className="text-sm font-medium">
                  {labels.selectSaveCategory}
                </label>
                <Select
                  value={targetCategoryId}
                  onValueChange={setTargetCategoryId}
                  disabled={busy}
                >
                  <SelectTrigger id="stopwatch-complete-category" className="w-full">
                    <SelectValue placeholder={labels.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          <div className="space-y-2">
            <label htmlFor="stopwatch-complete-title" className="text-sm font-medium">
              {labels.titleLabel}
            </label>
            <Input
              id="stopwatch-complete-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="stopwatch-complete-note" className="text-sm font-medium">
              {labels.noteOptional}
            </label>
            <Textarea
              id="stopwatch-complete-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              rows={2}
              placeholder={labels.notePlaceholder}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="stopwatch-complete-status" className="text-sm font-medium">
                {labels.status}
              </label>
              <Select value={status} onValueChange={setStatus} disabled={busy}>
                <SelectTrigger id="stopwatch-complete-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_BLOCK_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {statusLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="stopwatch-complete-level"
                className="text-sm font-medium"
              >
                {labels.completionRange}
              </label>
              <Input
                id="stopwatch-complete-level"
                type="number"
                min={0}
                max={100}
                value={completionLevel}
                onChange={(e) => setCompletionLevel(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
        </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {labels.cancel}
          </Button>
          {needsCategory && !hasCategories ? (
            <Button type="button" asChild>
              <Link href="/categories">{labels.goToCategories}</Link>
            </Button>
          ) : (
            <Button type="button" onClick={handleConfirm} disabled={confirmDisabled}>
              {busy ? labels.saving : needsCategory ? labels.finishAndSave : labels.stopwatchEndAndSave}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
