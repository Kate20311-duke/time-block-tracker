import { describe, expect, it, afterEach } from "vitest";
import {
  isValidIanaTimeZone,
  resolveCalendarTimeZone,
} from "./user-calendar-timezone";

describe("isValidIanaTimeZone", () => {
  it("accepts common IANA ids", () => {
    expect(isValidIanaTimeZone("America/New_York")).toBe(true);
    expect(isValidIanaTimeZone("Asia/Shanghai")).toBe(true);
    expect(isValidIanaTimeZone("UTC")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidIanaTimeZone("")).toBe(false);
    expect(isValidIanaTimeZone("Not/A/Timezone")).toBe(false);
    expect(isValidIanaTimeZone("GMT+8")).toBe(false);
  });
});

describe("resolveCalendarTimeZone", () => {
  const env = process.env.NEXT_PUBLIC_CALENDAR_TIMEZONE;

  afterEach(() => {
    if (env === undefined) {
      delete process.env.NEXT_PUBLIC_CALENDAR_TIMEZONE;
    } else {
      process.env.NEXT_PUBLIC_CALENDAR_TIMEZONE = env;
    }
  });

  it("prefers valid cookie over env", () => {
    process.env.NEXT_PUBLIC_CALENDAR_TIMEZONE = "Asia/Shanghai";
    expect(resolveCalendarTimeZone("America/New_York")).toBe("America/New_York");
  });

  it("uses NEXT_PUBLIC_CALENDAR_TIMEZONE when cookie is missing", () => {
    process.env.NEXT_PUBLIC_CALENDAR_TIMEZONE = "Europe/Berlin";
    expect(resolveCalendarTimeZone(undefined)).toBe("Europe/Berlin");
  });

  it("falls back to UTC when cookie and env are invalid", () => {
    delete process.env.NEXT_PUBLIC_CALENDAR_TIMEZONE;
    expect(resolveCalendarTimeZone("bad-tz")).toBe("UTC");
    expect(resolveCalendarTimeZone(null)).toBe("UTC");
  });

  it("ignores invalid env and uses UTC", () => {
    process.env.NEXT_PUBLIC_CALENDAR_TIMEZONE = "Invalid/Zone";
    expect(resolveCalendarTimeZone(undefined)).toBe("UTC");
  });
});
