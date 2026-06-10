"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { GlobalFocusTimerIndicator } from "@/components/global-focus-timer-indicator";
import type { GlobalActiveFocusSession } from "@/components/global-focus-timer-indicator";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { resolveAppNavTitle } from "@/lib/app-nav-config";
import type { Dictionary } from "@/lib/i18n/types";

type Props = {
  dict: Dictionary;
  activeFocusSession: GlobalActiveFocusSession | null;
};

export function AppHeader({ dict, activeFocusSession }: Props) {
  const pathname = usePathname();
  const title = resolveAppNavTitle(pathname, dict.nav);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-5" />
      <h1 className="text-lg font-semibold tracking-tight text-balance">{title}</h1>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        <GlobalFocusTimerIndicator
          session={activeFocusSession}
          labels={{
            activeTimerIndicator: dict.shell.activeTimerIndicator,
            activeTimerPaused: dict.shell.activeTimerPaused,
            stopwatchTimerAria: dict.focus.stopwatchTimerAria,
          }}
        />
        <InputGroup className="hidden w-56 md:flex">
          <InputGroupInput
            placeholder={dict.shell.searchPlaceholder}
            readOnly
            aria-hidden
            tabIndex={-1}
            className="pointer-events-none opacity-60"
          />
          <InputGroupAddon>
            <Search className="size-4 text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
        <Button size="sm" asChild className="shrink-0">
          <Link href="/time-blocks">
            <Plus data-icon="inline-start" />
            <span className="hidden sm:inline">{dict.shell.newTimeBlock}</span>
            <span className="sr-only sm:hidden">{dict.shell.newTimeBlock}</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
