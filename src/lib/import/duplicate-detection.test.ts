import { describe, expect, it } from "vitest";

import {
  ICS_IMPORT_CHECK_REASON,
  annotateEventsWithImportCheck,
  buildDuplicateKey,
  intervalsOverlap,
  isExactImportDuplicate,
  normalizeImportTitle,
  resolveImportCheckPriority,
} from "@/lib/import/duplicate-detection";
import type { ParsedIcsEvent } from "@/lib/import/ics-types";

const baseEvent = (overrides: Partial<ParsedIcsEvent> = {}): ParsedIcsEvent => ({
  id: "evt-1",
  summary: "Team meeting",
  start: "2026-06-01T09:00:00.000Z",
  end: "2026-06-01T10:00:00.000Z",
  isAllDay: false,
  categories: [],
  status: "supported",
  warnings: [],
  unsupportedReasons: [],
  ...overrides,
});

describe("normalizeImportTitle", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeImportTitle("  Hello   world  ")).toBe("Hello world");
  });
});

describe("intervalsOverlap", () => {
  it("detects overlapping intervals", () => {
    expect(
      intervalsOverlap(
        { startMs: 0, endMs: 60 },
        { startMs: 30, endMs: 90 },
      ),
    ).toBe(true);
  });

  it("returns false for touching intervals", () => {
    expect(
      intervalsOverlap(
        { startMs: 0, endMs: 60 },
        { startMs: 60, endMs: 120 },
      ),
    ).toBe(false);
  });
});

describe("buildDuplicateKey", () => {
  it("uses normalized title and timestamps", () => {
    const key = buildDuplicateKey({
      categoryId: "cat-1",
      title: "  Team   meeting ",
      startMs: 1000,
      endMs: 2000,
    });
    expect(key).toBe("cat-1|Team meeting|1000|2000");
  });
});

describe("isExactImportDuplicate", () => {
  it("matches same category, normalized title, and times", () => {
    expect(
      isExactImportDuplicate(
        {
          categoryId: "cat-1",
          title: "Team meeting",
          startMs: 1000,
          endMs: 2000,
        },
        {
          categoryId: "cat-1",
          title: "  Team   meeting",
          startMs: 1000,
          endMs: 2000,
        },
      ),
    ).toBe(true);
  });
});

describe("resolveImportCheckPriority", () => {
  it("prefers duplicate over conflict", () => {
    expect(
      resolveImportCheckPriority(["conflict", "duplicate", "ready"]),
    ).toBe("duplicate");
  });

  it("prefers unsupported over invalid", () => {
    expect(
      resolveImportCheckPriority(["invalid", "unsupported", "ready"]),
    ).toBe("unsupported");
  });
});

describe("annotateEventsWithImportCheck", () => {
  const categoryId = "cat-1";
  const existing = [
    {
      id: "tb-1",
      title: "Team meeting",
      startTime: new Date("2026-06-01T09:00:00.000Z"),
      endTime: new Date("2026-06-01T10:00:00.000Z"),
      categoryId,
      categoryName: "Work",
    },
    {
      id: "tb-2",
      title: "Lunch",
      startTime: new Date("2026-06-01T11:00:00.000Z"),
      endTime: new Date("2026-06-01T12:00:00.000Z"),
      categoryId: "cat-2",
      categoryName: "Personal",
    },
  ];

  it("marks exact duplicates with existing blocks", () => {
    const [event] = annotateEventsWithImportCheck(
      [baseEvent()],
      categoryId,
      existing,
    );
    expect(event.importCheck?.status).toBe("duplicate");
    expect(event.importCheck?.canImport).toBe(false);
    expect(event.importCheck?.reasons).toContain(
      ICS_IMPORT_CHECK_REASON.duplicateExact,
    );
  });

  it("marks later batch duplicates", () => {
    const events = annotateEventsWithImportCheck(
      [
        baseEvent({ id: "evt-1", summary: "New block" }),
        baseEvent({ id: "evt-2", summary: "New block" }),
      ],
      categoryId,
      [],
    );
    expect(events[0].importCheck?.status).toBe("ready");
    expect(events[1].importCheck?.status).toBe("batch_duplicate");
  });

  it("marks time conflicts with existing block details", () => {
    const [event] = annotateEventsWithImportCheck(
      [
        baseEvent({
          summary: "Overlap meeting",
          start: "2026-06-01T09:30:00.000Z",
          end: "2026-06-01T10:30:00.000Z",
        }),
      ],
      categoryId,
      existing,
    );
    expect(event.importCheck?.status).toBe("conflict");
    expect(event.importCheck?.conflicts?.[0]?.title).toBe("Team meeting");
    expect(event.importCheck?.reasons).toContain(
      ICS_IMPORT_CHECK_REASON.timeConflict,
    );
  });
});
