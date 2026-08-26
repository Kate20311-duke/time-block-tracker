import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  buildCategoryDurationSummarySql,
  durationMinutesByCategoryId,
  loadCategoryTimeBlockDurationMinutesByCategoryId,
  totalTimeBlockDurationMinutes,
} from "./category-time-block-duration";

const USER_ID = "user-1";

describe("totalTimeBlockDurationMinutes", () => {
  it("sums full TimeBlock durations for category A", () => {
    const minutes = totalTimeBlockDurationMinutes([
      {
        startTime: new Date("2026-08-26T13:00:00.000Z"),
        endTime: new Date("2026-08-26T14:30:00.000Z"),
      },
      {
        startTime: new Date("2026-08-26T15:00:00.000Z"),
        endTime: new Date("2026-08-26T16:00:00.000Z"),
      },
    ]);
    expect(minutes).toBe(150);
  });

  it("sums a different category independently", () => {
    expect(
      totalTimeBlockDurationMinutes([
        {
          startTime: new Date("2026-08-26T09:00:00.000Z"),
          endTime: new Date("2026-08-26T09:45:00.000Z"),
        },
      ]),
    ).toBe(45);
  });

  it("is 0 for an empty category", () => {
    expect(totalTimeBlockDurationMinutes([])).toBe(0);
  });

  it("uses the full overnight span, not dashboard day clipping", () => {
    expect(
      totalTimeBlockDurationMinutes([
        {
          startTime: new Date("2026-08-26T23:00:00.000Z"),
          endTime: new Date("2026-08-27T01:30:00.000Z"),
        },
      ]),
    ).toBe(150);
  });
});

describe("durationMinutesByCategoryId", () => {
  it("fills missing categories with 0 and ignores other users' rows", () => {
    const totals = durationMinutesByCategoryId(
      ["cat-a", "cat-b", "cat-empty"],
      [
        { categoryId: "cat-a", minutes: 90 },
        { categoryId: "other-user-cat", minutes: 999 },
      ],
    );
    expect(totals.get("cat-a")).toBe(90);
    expect(totals.get("cat-b")).toBe(0);
    expect(totals.get("cat-empty")).toBe(0);
    expect(totals.has("other-user-cat")).toBe(false);
  });
});

describe("buildCategoryDurationSummarySql", () => {
  it("aggregates in SQL scoped by category.userId", () => {
    const sql = buildCategoryDurationSummarySql(USER_ID, ["cat-a", "cat-b"]);
    const text = sql.sql.replace(/\s+/g, " ");
    expect(text).toContain('"app"."TimeBlock"');
    expect(text).toContain('"app"."Category"');
    expect(text).toContain('c."userId"');
    expect(text).toContain("GROUP BY");
    expect(text).toContain('EXTRACT(EPOCH FROM (tb."endTime" - tb."startTime"))');
    expect(sql.values).toContain(USER_ID);
    expect(sql.values).toContain("cat-a");
    expect(sql.values).toContain("cat-b");
  });
});

describe("loadCategoryTimeBlockDurationMinutesByCategoryId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not query when there are no category ids", async () => {
    const totals = await loadCategoryTimeBlockDurationMinutesByCategoryId(
      USER_ID,
      ["  "],
    );
    expect(totals.size).toBe(0);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("maps DB rows without including other users' categories", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { categoryId: "cat-a", minutes: 120 },
    ]);

    const totals = await loadCategoryTimeBlockDurationMinutesByCategoryId(
      USER_ID,
      ["cat-a", "cat-empty"],
    );

    expect(totals.get("cat-a")).toBe(120);
    expect(totals.get("cat-empty")).toBe(0);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = vi.mocked(prisma.$queryRaw).mock.calls[0]?.[0] as {
      values?: unknown[];
    };
    expect(sql.values).toContain(USER_ID);
    expect(sql.values).not.toContain("other-user");
  });
});
