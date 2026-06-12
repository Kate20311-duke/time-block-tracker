import { describe, expect, it } from "vitest";

import {
  CSV_UTF8_BOM,
  escapeCsvCell,
  formatExportDateTime,
  timeBlocksToCsv,
  type TimeBlockCsvRow,
} from "@/lib/export/csv";

describe("escapeCsvCell", () => {
  it("returns empty string for null and undefined", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("quotes cells with commas", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });

  it("escapes double quotes", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes cells with newlines", () => {
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("formatExportDateTime", () => {
  it("formats instant in user timezone", () => {
    const formatted = formatExportDateTime(
      new Date("2026-06-01T13:00:00.000Z"),
      "Asia/Shanghai",
    );
    expect(formatted).toBe("2026-06-01 21:00:00");
  });
});

describe("timeBlocksToCsv", () => {
  const sampleRow: TimeBlockCsvRow = {
    title: "Study",
    categoryName: "学习",
    categoryColor: "#3b82f6",
    startTime: new Date("2026-06-01T01:00:00.000Z"),
    endTime: new Date("2026-06-01T02:00:00.000Z"),
    status: "completed",
    completionLevel: 100,
    efficiencyLevel: "high",
    source: "manual",
    note: 'note, with "quotes"',
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T02:30:00.000Z"),
  };

  it("includes UTF-8 BOM and header row", () => {
    const csv = timeBlocksToCsv([sampleRow], "UTC");
    expect(csv.startsWith(CSV_UTF8_BOM)).toBe(true);
    expect(csv).toContain("Title,Category,Category Color");
  });

  it("escapes special characters in data rows", () => {
    const csv = timeBlocksToCsv([sampleRow], "UTC");
    expect(csv).toContain('"note, with ""quotes"""');
  });
});
