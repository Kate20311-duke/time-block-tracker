import { describe, expect, it } from "vitest";
import { summarizeCompletionQuality, type TimeBlockLike } from "./stats";

function block(partial: Partial<TimeBlockLike>): TimeBlockLike {
  return {
    startTime: partial.startTime ?? new Date("2026-05-21T10:00:00Z"),
    endTime: partial.endTime ?? new Date("2026-05-21T11:00:00Z"),
    categoryId: partial.categoryId ?? "cat1",
    status: partial.status ?? "planned",
    completionLevel: partial.completionLevel ?? null,
    efficiencyLevel: partial.efficiencyLevel ?? null,
  };
}

describe("summarizeCompletionQuality", () => {
  it("handles empty input", () => {
    const s = summarizeCompletionQuality([]);
    expect(s.totalPlannedMinutes).toBe(0);
    expect(s.totalCompletedMinutes).toBe(0);
    expect(s.totalSkippedMinutes).toBe(0);
    expect(s.totalPartialMinutes).toBe(0);
    expect(s.completionRate).toBe(0);
    expect(s.skippedRate).toBe(0);
    expect(s.averageCompletionLevel).toBe(0);
  });

  it("counts completed block as fully completed minutes", () => {
    const s = summarizeCompletionQuality([
      block({
        status: "completed",
        startTime: new Date("2026-05-21T10:00:00Z"),
        endTime: new Date("2026-05-21T11:00:00Z"),
      }),
    ]);
    expect(s.totalPlannedMinutes).toBe(60);
    expect(s.totalCompletedMinutes).toBe(60);
    expect(s.totalSkippedMinutes).toBe(0);
    expect(s.totalPartialMinutes).toBe(0);
    expect(s.completionRate).toBe(1);
  });

  it("counts skipped block as skipped minutes (not completed)", () => {
    const s = summarizeCompletionQuality([
      block({
        status: "skipped",
        startTime: new Date("2026-05-21T10:00:00Z"),
        endTime: new Date("2026-05-21T11:00:00Z"),
      }),
    ]);
    expect(s.totalPlannedMinutes).toBe(60);
    expect(s.totalCompletedMinutes).toBe(0);
    expect(s.totalSkippedMinutes).toBe(60);
    expect(s.skippedRate).toBe(1);
  });

  it("counts partial block with 50% completion as half completed minutes", () => {
    const s = summarizeCompletionQuality([
      block({
        status: "partial",
        completionLevel: 50,
        startTime: new Date("2026-05-21T10:00:00Z"),
        endTime: new Date("2026-05-21T11:00:00Z"),
      }),
    ]);
    expect(s.totalPlannedMinutes).toBe(60);
    expect(s.totalPartialMinutes).toBe(60);
    expect(s.totalCompletedMinutes).toBe(30);
    expect(s.completionRate).toBe(0.5);
    expect(s.averageCompletionLevel).toBe(50);
  });
});

