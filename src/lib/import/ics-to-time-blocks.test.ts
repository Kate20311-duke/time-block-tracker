import { describe, expect, it } from "vitest";

import { ICS_UNSUPPORTED_REASON } from "@/lib/import/ics-parse";
import type { ParsedIcsEvent } from "@/lib/import/ics-types";
import {
  ICS_IMPORT_TIME_BLOCK_SOURCE,
  buildIcsImportNote,
  isImportableIcsEvent,
  mapIcsEventToTimeBlockCreate,
} from "@/lib/import/ics-to-time-blocks";

const supportedEvent: ParsedIcsEvent = {
  id: "evt-1",
  uid: "uid-1",
  summary: "Team meeting",
  description: "Sync notes",
  location: "Room A",
  start: "2026-06-01T09:00:00.000Z",
  end: "2026-06-01T10:00:00.000Z",
  isAllDay: false,
  categories: ["Work"],
  status: "supported",
  warnings: [],
  unsupportedReasons: [],
};

describe("isImportableIcsEvent", () => {
  it("accepts supported timed events", () => {
    expect(isImportableIcsEvent(supportedEvent)).toBe(true);
  });

  it("rejects warning all-day events", () => {
    const allDay: ParsedIcsEvent = {
      ...supportedEvent,
      isAllDay: true,
      status: "warning",
      start: "2026-06-02",
      end: "2026-06-03",
      warnings: ["all_day"],
    };
    expect(isImportableIcsEvent(allDay)).toBe(false);
  });

  it("rejects recurring unsupported events", () => {
    const recurring: ParsedIcsEvent = {
      ...supportedEvent,
      status: "unsupported",
      unsupportedReasons: [ICS_UNSUPPORTED_REASON.recurring],
    };
    expect(isImportableIcsEvent(recurring)).toBe(false);
  });
});

describe("mapIcsEventToTimeBlockCreate", () => {
  it("maps supported events to planned ics_import blocks", () => {
    const result = mapIcsEventToTimeBlockCreate(supportedEvent, "cat-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toMatchObject({
      title: "Team meeting",
      categoryId: "cat-1",
      status: "planned",
      completionLevel: 0,
      source: ICS_IMPORT_TIME_BLOCK_SOURCE,
    });
    expect(result.data.note).toBe("Sync notes\n\nLocation: Room A");
    expect(result.data.startTime.toISOString()).toBe("2026-06-01T09:00:00.000Z");
    expect(result.data.endTime.toISOString()).toBe("2026-06-01T10:00:00.000Z");
  });

  it("skips unsupported recurring events", () => {
    const recurring: ParsedIcsEvent = {
      ...supportedEvent,
      status: "unsupported",
      unsupportedReasons: [ICS_UNSUPPORTED_REASON.recurring],
    };
    const result = mapIcsEventToTimeBlockCreate(recurring, "cat-1");
    expect(result).toEqual({ ok: false, reason: "not_supported" });
  });
});

describe("buildIcsImportNote", () => {
  it("combines description and location", () => {
    expect(
      buildIcsImportNote({
        description: "Notes",
        location: "Office",
      }),
    ).toBe("Notes\n\nLocation: Office");
  });
});
