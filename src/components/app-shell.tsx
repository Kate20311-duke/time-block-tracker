import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import type { GlobalActiveFocusSession } from "@/components/global-focus-timer-indicator";
import type { Dictionary, Locale } from "@/lib/i18n/types";

type ShellUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type Props = {
  children: ReactNode;
  locale: Locale;
  dict: Dictionary;
  user: ShellUser;
  signOutAction: () => Promise<void>;
  activeFocusSession: GlobalActiveFocusSession | null;
};

export function AppShell({
  children,
  locale,
  dict,
  user,
  signOutAction,
  activeFocusSession,
}: Props) {
  return (
    <SidebarProvider>
      <AppSidebar
        locale={locale}
        dict={dict}
        user={user}
        signOutAction={signOutAction}
      />
      <SidebarInset>
        <AppHeader dict={dict} activeFocusSession={activeFocusSession} />
        <main className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
