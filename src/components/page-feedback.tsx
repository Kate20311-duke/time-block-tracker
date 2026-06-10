"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { PageErrorCard } from "@/components/page-error-card";

type Props = {
  successMessage?: string | null;
  errorMessage?: string | null;
  errorTitle?: string;
  /** Mirror inline feedback as toast (default true). */
  showToast?: boolean;
};

export function PageFeedback({
  successMessage,
  errorMessage,
  errorTitle,
  showToast = true,
}: Props) {
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showToast) return;
    const key = successMessage
      ? `success:${successMessage}`
      : errorMessage
        ? `error:${errorMessage}`
        : null;
    if (!key || key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (successMessage) toast.success(successMessage);
    if (errorMessage) toast.error(errorMessage);
  }, [successMessage, errorMessage, showToast]);

  return (
    <>
      {successMessage ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          {successMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <PageErrorCard title={errorTitle} message={errorMessage} />
      ) : null}
    </>
  );
}
