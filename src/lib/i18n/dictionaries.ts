import type { TimeBlockStatus } from "@/lib/constants";
import { en } from "./en";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES,
  type Dictionary,
  type Locale,
} from "./types";
import { zh } from "./zh";

const dictionaries: Record<Locale, Dictionary> = { zh, en };

export function isLocale(value: string): value is Locale {
  return value === "zh" || value === "en";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function getStatusLabel(status: string, locale: Locale): string {
  const dict = getDictionary(locale);
  if (status in dict.status) {
    return dict.status[status as TimeBlockStatus];
  }
  return status;
}

/** Replace `{key}` placeholders in translation strings. */
export function formatMessage(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? `{${key}}`),
  );
}

export type { Dictionary, Locale };
export { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES };
