"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  labels: { aria: string; zh: string; en: string };
};

export function LanguageSwitcher({ locale, labels }: Props) {
  const router = useRouter();

  function setLocale(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }

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
