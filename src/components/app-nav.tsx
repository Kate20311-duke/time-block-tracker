"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Dictionary, Locale } from "@/lib/i18n/types";

const NAV_ITEMS: { href: string; labelKey: keyof Dictionary["nav"] }[] = [
  { href: "/", labelKey: "home" },
  { href: "/categories", labelKey: "categories" },
  { href: "/time-blocks", labelKey: "timeBlocks" },
  { href: "/calendar", labelKey: "calendar" },
  { href: "/dashboard", labelKey: "dashboard" },
];

type Props = {
  locale: Locale;
  dict: Dictionary;
};

export function AppNav({ locale, dict }: Props) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900 hover:text-zinc-700"
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
          <nav
            aria-label={dict.nav.aria}
            className="flex flex-wrap items-center gap-1 sm:gap-2"
          >
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {dict.nav[item.labelKey]}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
