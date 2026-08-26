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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMessage } from "@/lib/i18n";

export type MoveTimeBlocksDialogCategory = {
  id: string;
  name: string;
};

export type MoveTimeBlocksDialogLabels = {
  title: string;
  targetCategory: string;
  selectTarget: string;
  description: string;
  confirm: string;
  moving: string;
  cancel: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceCategoryName: string;
  selectedCount: number;
  categories: MoveTimeBlocksDialogCategory[];
  pending: boolean;
  labels: MoveTimeBlocksDialogLabels;
  onConfirm: (targetCategoryId: string) => void;
};

export function MoveTimeBlocksDialog({
  open,
  onOpenChange,
  sourceCategoryName,
  selectedCount,
  categories,
  pending,
  labels,
  onConfirm,
}: Props) {
  const [targetCategoryId, setTargetCategoryId] = useState("");

  const targetCategory = categories.find(
    (category) => category.id === targetCategoryId,
  );

  function handleOpenChange(nextOpen: boolean) {
    if (pending) {
      return;
    }
    if (!nextOpen) {
      setTargetCategoryId("");
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
          <DialogDescription>
            {targetCategory
              ? formatMessage(labels.description, {
                  source: sourceCategoryName,
                  target: targetCategory.name,
                })
              : labels.selectTarget}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="move-target-category">
            {labels.targetCategory}
          </label>
          <Select
            value={targetCategoryId || undefined}
            onValueChange={setTargetCategoryId}
            disabled={pending || categories.length === 0}
          >
            <SelectTrigger id="move-target-category" className="w-full">
              <SelectValue placeholder={labels.selectTarget} />
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
            disabled={pending || !targetCategoryId}
            onClick={() => onConfirm(targetCategoryId)}
          >
            {pending
              ? labels.moving
              : formatMessage(labels.confirm, { count: selectedCount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
