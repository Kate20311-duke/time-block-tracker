"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary";
  className?: string;
};

export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  className,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant === "primary" ? "default" : "secondary"}
      className={className}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" data-icon="inline-start" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
