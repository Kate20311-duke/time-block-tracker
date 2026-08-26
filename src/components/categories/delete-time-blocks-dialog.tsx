"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMessage } from "@/lib/i18n";

export type DeleteTimeBlocksDialogLabels = {
  title: string;
  description: string;
  confirm: string;
  deleting: string;
  cancel: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  pending: boolean;
  labels: DeleteTimeBlocksDialogLabels;
  onConfirm: () => void;
};

export function DeleteTimeBlocksDialog({
  open,
  onOpenChange,
  selectedCount,
  pending,
  labels,
  onConfirm,
}: Props) {
  function handleOpenChange(nextOpen: boolean) {
    if (pending) {
      return;
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!pending} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {formatMessage(labels.title, { count: selectedCount })}
          </DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t-0 bg-transparent p-0 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            {labels.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || selectedCount === 0}
            onClick={onConfirm}
          >
            {pending
              ? labels.deleting
              : formatMessage(labels.confirm, { count: selectedCount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
