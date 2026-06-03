"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CALENDAR_TIMEZONE_COOKIE,
  CALENDAR_TZ_REFRESH_SESSION_KEY,
  isValidIanaTimeZone,
} from "@/lib/user-calendar-timezone";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

function writeCookie(name: string, value: string): void {
  const encoded = encodeURIComponent(value);
  document.cookie = `${name}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function detectBrowserTimeZone(): string | null {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    if (!timeZone || !isValidIanaTimeZone(timeZone)) {
      return null;
    }
    return timeZone;
  } catch {
    return null;
  }
}

/**
 * Sync browser IANA timezone to `calendar_time_zone` cookie.
 * Refreshes RSC once when the cookie was missing or stale (no infinite loop).
 */
export function TimezoneInitializer() {
  const router = useRouter();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (syncedRef.current) {
      return;
    }
    syncedRef.current = true;

    const detected = detectBrowserTimeZone();
    if (!detected) {
      return;
    }

    const existing = readCookie(CALENDAR_TIMEZONE_COOKIE);
    if (existing === detected) {
      return;
    }

    writeCookie(CALENDAR_TIMEZONE_COOKIE, detected);

    try {
      const lastRefreshFor = sessionStorage.getItem(CALENDAR_TZ_REFRESH_SESSION_KEY);
      if (lastRefreshFor !== detected) {
        sessionStorage.setItem(CALENDAR_TZ_REFRESH_SESSION_KEY, detected);
        router.refresh();
      }
    } catch {
      router.refresh();
    }
  }, [router]);

  return null;
}
