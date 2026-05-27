import { cookies } from "next/headers";
import { isLocale } from "./dictionaries";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./types";

/** Read locale from the `locale` cookie (server-only). */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}
