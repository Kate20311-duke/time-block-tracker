"use client";

import { useState } from "react";
import Link from "next/link";

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
import { hasAvailableSaveCategories } from "@/lib/focus-category-display";
import type { Dictionary } from "@/lib/i18n/types";

export type FocusReassignmentCategory = {
  id: string;
  name: string;
};

export type FocusCategoryReassignmentMode = "complete" | "convert";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: FocusCategoryReassignmentMode;
  categories: FocusReassignmentCategory[];
  pending: boolean;
  labels: Pick<
    Dictionary["focus"],
    | "categoryRemovedSaveTitle"
    | "categoryRemovedSaveDescription"
    | "categoryRemovedConvertTitle"
    | "categoryRemovedConvertDescription"
    | "selectSaveCategory"
    | "selectCategory"
    | "finishAndSave"
    | "convertWithCategory"
    | "noAvailableCategories"
    | "createCategoryFirst"
    | "goToCategories"
    | "saving"
    | "converting"
  > &
    Pick<Dictionary["common"], "cancel">;
  onConfirm: (targetCategoryId: string) => void;
};

export function FocusCategoryReassignmentDialog({
  open,
  onOpenChange,
  mode,
  categories,
  pending,
  labels,
  onConfirm,
}: Props) {
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const hasCategories = hasAvailableSaveCategories(categories);
  const title =
    mode === "complete"
      ? labels.categoryRemovedSaveTitle
      : labels.categoryRemovedConvertTitle;
  const description = hasCategories
    ? mode === "complete"
      ? labels.categoryRemovedSaveDescription
      : labels.categoryRemovedConvertDescription
    : labels.createCategoryFirst;
  const confirmLabel =
    mode === "complete" ? labels.finishAndSave : labels.convertWithCategory;
  const pendingLabel = mode === "complete" ? labels.saving : labels.converting;

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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {hasCategories ? (
          <div className="space-y-2 py-2">
            <label htmlFor="focus-reassign-category" className="text-sm font-medium">
              {labels.selectSaveCategory}
            </label>
            <Select
              value={targetCategoryId}
              onValueChange={setTargetCategoryId}
              disabled={pending}
            >
              <SelectTrigger id="focus-reassign-category" className="w-full">
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
        ) : (
          <p className="text-sm text-muted-foreground">{labels.noAvailableCategories}</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            {labels.cancel}
          </Button>
          {hasCategories ? (
            <Button
              type="button"
              onClick={() => onConfirm(targetCategoryId)}
              disabled={pending || !targetCategoryId}
            >
              {pending ? pendingLabel : confirmLabel}
            </Button>
          ) : (
            <Button type="button" asChild>
              <Link href="/categories">{labels.goToCategories}</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
