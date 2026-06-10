"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import type { GlobalActiveFocusSession } from "@/components/global-focus-timer-indicator";
import { LanguageSwitcher } from "@/components/language-switcher";
import { isAppRoute } from "@/lib/app-nav-config";
import type { Dictionary, Locale } from "@/lib/i18n/types";

type LayoutUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type Props = {
  children: React.ReactNode;
  locale: Locale;
  dict: Dictionary;
  user: LayoutUser | null;
  signOutAction: () => Promise<void>;
  activeFocusSession: GlobalActiveFocusSession | null;
};

export function AppLayoutController({
  children,
  locale,
  dict,
  user,
  signOutAction,
  activeFocusSession,
}: Props) {
  const pathname = usePathname();
  const useShell = user !== null && isAppRoute(pathname);

  if (useShell) {
    return (
      <AppShell
        locale={locale}
        dict={dict}
        user={user}
        signOutAction={signOutAction}
        activeFocusSession={activeFocusSession}
      >
        {children}
      </AppShell>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight hover:text-muted-foreground"
          >
            {dict.app.brand}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher
              locale={locale}
              labels={{
                aria: dict.lang.switcherAria,
                zh: dict.lang.zh,
                en: dict.lang.en,
              }}
            />
            {user ? (
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {dict.nav.signOut}
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {dict.nav.signIn}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
