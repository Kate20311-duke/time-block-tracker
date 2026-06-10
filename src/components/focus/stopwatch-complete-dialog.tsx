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
import { TIME_BLOCK_STATUSES } from "@/lib/constants";
import type { Dictionary } from "@/lib/i18n/types";

export type StopwatchCompleteFormValues = {
  title: string;
  note: string;
  status: string;
  completionLevel: number;
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
  > &
    Pick<Dictionary["timeBlocks"], "status" | "completionRange"> &
    Pick<Dictionary["common"], "cancel">;
  statusLabels: Dictionary["status"];
  onConfirm: (values: StopwatchCompleteFormValues) => void | Promise<void>;
  busy?: boolean;
};

export function StopwatchCompleteDialog({
  open,
  onOpenChange,
  defaultValues,
  labels,
  statusLabels,
  onConfirm,
  busy = false,
}: Props) {
  const [title, setTitle] = useState(defaultValues.title);
  const [note, setNote] = useState(defaultValues.note);
  const [status, setStatus] = useState(defaultValues.status);
  const [completionLevel, setCompletionLevel] = useState(
    String(defaultValues.completionLevel),
  );

  const handleConfirm = async () => {
    const level = Number(completionLevel);
    await onConfirm({
      title: title.trim() || defaultValues.title,
      note: note.trim(),
      status,
      completionLevel: Number.isNaN(level) ? defaultValues.completionLevel : level,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{labels.stopwatchCompleteDialogTitle}</DialogTitle>
          <DialogDescription>
            {labels.stopwatchCompleteDialogDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {labels.cancel}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={busy}>
            {labels.stopwatchEndAndSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
