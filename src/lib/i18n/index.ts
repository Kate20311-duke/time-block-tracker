/**
 * Client-safe i18n exports (dictionaries, types, pure helpers).
 * Server Components: import `getLocale` from `@/lib/i18n/server`.
 */
export {
  DEFAULT_LOCALE,
  formatMessage,
  getDictionary,
  getStatusLabel,
  isLocale,
  LOCALE_COOKIE,
  LOCALES,
  type Dictionary,
  type Locale,
} from "./dictionaries";
