import { describe, expect, it } from "vitest";
import { formatCalendarDateParam } from "@/lib/calendar";

describe("calendar date param from UTC instant (TZ-4.5)", () => {
  const instant = new Date("2026-06-01T03:00:00.000Z");

  it("maps to previous local day in America/New_York", () => {
    expect(formatCalendarDateParam(instant, "America/New_York")).toBe(
      "2026-05-31",
    );
  });

  it("maps to same UTC calendar day in Asia/Shanghai", () => {
    expect(formatCalendarDateParam(instant, "Asia/Shanghai")).toBe("2026-06-01");
  });
});
