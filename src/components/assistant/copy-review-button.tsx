"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  copiedLabel: string;
  failedLabel: string;
  getText: () => string;
  disabled?: boolean;
};

export function CopyReviewButton({
  label,
  copiedLabel,
  failedLabel,
  getText,
  disabled = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      toast.success(copiedLabel);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(failedLabel);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      disabled={disabled}
      className="w-fit"
    >
      {copied ? (
        <Check aria-hidden className="text-emerald-600" />
      ) : (
        <Copy aria-hidden />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
