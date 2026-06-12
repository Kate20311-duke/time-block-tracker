import { describe, expect, it } from "vitest";

import {
  ICS_PREVIEW_MAX_EVENTS,
  ICS_UNSUPPORTED_REASON,
  ICS_WARNING,
  parseIcsPreview,
  IcsParseError,
} from "@/lib/import/ics-parse";

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TimeBlock Tracker Test//EN
BEGIN:VEVENT
UID:timed-1@example.com
DTSTART:20260601T090000Z
DTEND:20260601T100000Z
SUMMARY:Team meeting
CATEGORIES:Work,Planning
DESCRIPTION:Weekly sync
LOCATION:Room A
END:VEVENT
BEGIN:VEVENT
UID:allday-1@example.com
DTSTART;VALUE=DATE:20260602
DTEND;VALUE=DATE:20260603
SUMMARY:Conference day
END:VEVENT
BEGIN:VEVENT
UID:recur-1@example.com
DTSTART:20260603T100000Z
DTEND:20260603T110000Z
RRULE:FREQ=WEEKLY;COUNT=4
SUMMARY:Recurring standup
END:VEVENT
BEGIN:VEVENT
UID:cancel-1@example.com
DTSTART:20260604T140000Z
DTEND:20260604T150000Z
SUMMARY:Cancelled call
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

describe("parseIcsPreview", () => {
  it("parses timed, all-day, recurring, and cancelled events", () => {
    const result = parseIcsPreview(SAMPLE_ICS, "sample.ics");

    expect(result.fileName).toBe("sample.ics");
    expect(result.summary.total).toBe(4);
    expect(result.summary.supported).toBe(1);
    expect(result.summary.warning).toBe(1);
    expect(result.summary.unsupported).toBe(2);
    expect(result.truncated).toBe(false);

    const timed = result.events.find((e) => e.uid === "timed-1@example.com");
    expect(timed?.status).toBe("supported");
    expect(timed?.summary).toBe("Team meeting");
    expect(timed?.categories).toEqual(["Work", "Planning"]);
    expect(timed?.start).toBe("2026-06-01T09:00:00.000Z");

    const allDay = result.events.find((e) => e.uid === "allday-1@example.com");
    expect(allDay?.isAllDay).toBe(true);
    expect(allDay?.status).toBe("warning");
    expect(allDay?.warnings).toContain(ICS_WARNING.allDay);

    const recurring = result.events.find((e) => e.uid === "recur-1@example.com");
    expect(recurring?.status).toBe("unsupported");
    expect(recurring?.unsupportedReasons).toContain(
      ICS_UNSUPPORTED_REASON.recurring,
    );

    const cancelled = result.events.find((e) => e.uid === "cancel-1@example.com");
    expect(cancelled?.status).toBe("unsupported");
    expect(cancelled?.unsupportedReasons).toContain(
      ICS_UNSUPPORTED_REASON.cancelled,
    );
  });

  it("throws on empty input", () => {
    expect(() => parseIcsPreview("   ")).toThrow(IcsParseError);
  });

  it("throws on invalid ICS", () => {
    expect(() => parseIcsPreview("not an ics file")).toThrow(IcsParseError);
  });

  it("truncates very large event lists", () => {
    const events = Array.from({ length: ICS_PREVIEW_MAX_EVENTS + 3 }, (_, i) => {
      const day = String((i % 28) + 1).padStart(2, "0");
      return `BEGIN:VEVENT
UID:bulk-${i}@example.com
DTSTART:202606${day}T090000Z
DTEND:202606${day}T100000Z
SUMMARY:Event ${i}
END:VEVENT`;
    }).join("\n");

    const bulkIcs = `BEGIN:VCALENDAR\nVERSION:2.0\n${events}\nEND:VCALENDAR`;
    const result = parseIcsPreview(bulkIcs);

    expect(result.summary.total).toBe(ICS_PREVIEW_MAX_EVENTS + 3);
    expect(result.events).toHaveLength(ICS_PREVIEW_MAX_EVENTS);
    expect(result.truncated).toBe(true);
  });
});
