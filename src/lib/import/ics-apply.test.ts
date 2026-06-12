import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/db/scoped", () => ({
  assertCategoryOwned: vi.fn(),
  timeBlocksForUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

import { applyIcsImport } from "@/lib/import/ics-apply";
import { assertCategoryOwned, timeBlocksForUser } from "@/lib/db/scoped";
import { ScopedAccessError } from "@/lib/db/scoped-errors";
import { prisma } from "@/lib/prisma";

const USER_ID = "user-1";
const CATEGORY_ID = "cat-1";

const supportedEvent = {
  id: "evt-1",
  summary: "Focus block",
  description: "Deep work",
  location: undefined,
  start: "2026-06-01T09:00:00.000Z",
  end: "2026-06-01T10:00:00.000Z",
  isAllDay: false,
  status: "supported" as const,
};

describe("applyIcsImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertCategoryOwned).mockResolvedValue({
      id: CATEGORY_ID,
    } as Awaited<ReturnType<typeof assertCategoryOwned>>);
    vi.mocked(timeBlocksForUser).mockResolvedValue([]);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        timeBlock: {
          create: vi
            .fn()
            .mockResolvedValueOnce({ id: "tb-1" })
            .mockResolvedValueOnce({ id: "tb-2" }),
        },
      } as never),
    );
  });

  it("imports supported events and skips unsupported ones", async () => {
    const result = await applyIcsImport({
      userId: USER_ID,
      categoryId: CATEGORY_ID,
      events: [
        supportedEvent,
        {
          ...supportedEvent,
          id: "evt-2",
          summary: "Recurring",
          status: "unsupported",
        },
      ],
    });

    expect(assertCategoryOwned).toHaveBeenCalledWith(USER_ID, CATEGORY_ID);
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.unsupportedCount).toBe(1);
    expect(result.createdTimeBlockIds).toEqual(["tb-1"]);
    expect(result.skipped[0]?.reason).toBe("not_supported");
  });

  it("skips exact duplicates in the database", async () => {
    vi.mocked(timeBlocksForUser).mockResolvedValue([
      {
        id: "tb-existing",
        title: "Focus block",
        startTime: new Date("2026-06-01T09:00:00.000Z"),
        endTime: new Date("2026-06-01T10:00:00.000Z"),
        categoryId: CATEGORY_ID,
        category: { name: "Work" },
      },
    ] as unknown as Awaited<ReturnType<typeof timeBlocksForUser>>);

    const result = await applyIcsImport({
      userId: USER_ID,
      categoryId: CATEGORY_ID,
      events: [supportedEvent],
    });

    expect(result.importedCount).toBe(0);
    expect(result.duplicateCount).toBe(1);
    expect(result.skipped[0]?.reason).toBe("duplicate_exact");
  });

  it("skips batch duplicates", async () => {
    const result = await applyIcsImport({
      userId: USER_ID,
      categoryId: CATEGORY_ID,
      events: [
        supportedEvent,
        { ...supportedEvent, id: "evt-2" },
      ],
    });

    expect(result.importedCount).toBe(1);
    expect(result.batchDuplicateCount).toBe(1);
    expect(result.skipped[0]?.reason).toBe("batch_duplicate");
  });

  it("skips conflicts by default and imports them when includeConflicts is true", async () => {
    vi.mocked(timeBlocksForUser).mockResolvedValue([
      {
        id: "tb-existing",
        title: "Other block",
        startTime: new Date("2026-06-01T09:30:00.000Z"),
        endTime: new Date("2026-06-01T10:30:00.000Z"),
        categoryId: CATEGORY_ID,
        category: { name: "Work" },
      },
    ] as unknown as Awaited<ReturnType<typeof timeBlocksForUser>>);

    const skipped = await applyIcsImport({
      userId: USER_ID,
      categoryId: CATEGORY_ID,
      events: [supportedEvent],
    });
    expect(skipped.importedCount).toBe(0);
    expect(skipped.conflictSkippedCount).toBe(1);

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        timeBlock: {
          create: vi.fn().mockResolvedValueOnce({ id: "tb-new" }),
        },
      } as never),
    );

    const imported = await applyIcsImport({
      userId: USER_ID,
      categoryId: CATEGORY_ID,
      events: [supportedEvent],
      includeConflicts: true,
    });
    expect(imported.importedCount).toBe(1);
    expect(imported.conflictImportedCount).toBe(1);
  });

  it("rejects invalid category ownership", async () => {
    vi.mocked(assertCategoryOwned).mockRejectedValue(new ScopedAccessError());

    await expect(
      applyIcsImport({
        userId: USER_ID,
        categoryId: "other-cat",
        events: [supportedEvent],
      }),
    ).rejects.toThrow("INVALID_CATEGORY");
  });
});
