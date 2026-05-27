"use client";

import { useFormStatus } from "react-dom";

type Props = {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary";
  className?: string;
};

const variantClasses = {
  primary:
    "rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50",
};

export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  className,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? variantClasses[variant]}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
