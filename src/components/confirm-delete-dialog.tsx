"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  disabled?: boolean;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  disabled = false,
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span
        className={disabled ? "pointer-events-none opacity-50" : undefined}
        onClick={(e) => {
          if (disabled) return;
          e.preventDefault();
          setOpen(true);
        }}
      >
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t-0 bg-transparent p-0 pt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
