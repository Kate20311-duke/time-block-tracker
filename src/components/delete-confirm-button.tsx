"use client";

import { useRef, useState } from "react";

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
  action: (formData: FormData) => Promise<void>;
  id: string;
  confirmMessage: string;
  deleteLabel: string;
  cancelLabel: string;
  confirmTitle: string;
  disabled?: boolean;
  extraFields?: Record<string, string>;
};

export function DeleteConfirmButton({
  action,
  id,
  confirmMessage,
  deleteLabel,
  cancelLabel,
  confirmTitle,
  disabled = false,
  extraFields,
}: Props) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {deleteLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmMessage}</DialogDescription>
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
                formRef.current?.requestSubmit();
              }}
            >
              {deleteLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="id" value={id} />
        {extraFields
          ? Object.entries(extraFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))
          : null}
      </form>
    </>
  );
}
