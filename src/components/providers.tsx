"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

type Props = {
  children: React.ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <TooltipProvider delayDuration={0}>
      {children}
      <Toaster richColors closeButton position="top-center" />
    </TooltipProvider>
  );
}
