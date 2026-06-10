"use client";

import { useRouter } from "next/navigation";
import { Check, Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  labels: { aria: string; zh: string; en: string };
  /** Sidebar uses a compact dropdown that opens upward to avoid covering main content. */
  variant?: "inline" | "sidebar";
};

function InlineLanguageSwitcher({
  locale,
  labels,
  setLocale,
}: Props & { setLocale: (next: Locale) => void }) {
  return (
    <div
      className="flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-sm"
      role="group"
      aria-label={labels.aria}
    >
      <button
        type="button"
        onClick={() => setLocale("zh")}
        className={`rounded px-2.5 py-1 font-medium transition-colors ${
          locale === "zh"
            ? "bg-white text-zinc-900 shadow-sm"
            : "text-zinc-600 hover:text-zinc-900"
        }`}
      >
        {labels.zh}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded px-2.5 py-1 font-medium transition-colors ${
          locale === "en"
            ? "bg-white text-zinc-900 shadow-sm"
            : "text-zinc-600 hover:text-zinc-900"
        }`}
      >
        {labels.en}
      </button>
    </div>
  );
}

function SidebarLanguageSwitcher({
  locale,
  labels,
  setLocale,
}: Props & { setLocale: (next: Locale) => void }) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const currentLabel = locale === "zh" ? labels.zh : labels.en;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={collapsed ? "icon-sm" : "sm"}
          className={cn(
            "min-w-0 border-border bg-background font-normal",
            collapsed ? "size-8" : "h-8 w-full justify-start gap-2 px-2",
          )}
          aria-label={labels.aria}
        >
          <Languages className="size-4 shrink-0" />
          {!collapsed ? (
            <span className="min-w-0 flex-1 truncate text-left">
              {currentLabel}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={6}
        collisionPadding={16}
        className="z-40 w-36 min-w-0 max-w-[calc(var(--sidebar-width,16rem)-0.75rem)]"
      >
        <DropdownMenuItem
          onClick={() => setLocale("zh")}
          className="justify-between gap-2"
        >
          <span>{labels.zh}</span>
          {locale === "zh" ? <Check className="size-4 shrink-0" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale("en")}
          className="justify-between gap-2"
        >
          <span>{labels.en}</span>
          {locale === "en" ? <Check className="size-4 shrink-0" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSwitcher({
  locale,
  labels,
  variant = "inline",
}: Props) {
  const router = useRouter();

  function setLocale(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }

  if (variant === "sidebar") {
    return (
      <SidebarLanguageSwitcher
        locale={locale}
        labels={labels}
        setLocale={setLocale}
      />
    );
  }

  return (
    <InlineLanguageSwitcher
      locale={locale}
      labels={labels}
      setLocale={setLocale}
    />
  );
}
