import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/scoped", () => ({
  assertCategoryOwned: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    timeBlock: {
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { assertCategoryOwned } from "@/lib/db/scoped";
import { ScopedAccessError } from "@/lib/db/scoped-errors";
import { prisma } from "@/lib/prisma";
import {
  MAX_BULK_TIME_BLOCKS,
  moveTimeBlocksToCategoryForUser,
  sanitizeTimeBlockIds,
} from "./category-time-block-move";

const USER_ID = "user-1";
const SOURCE_CATEGORY_ID = "cat-study";
const TARGET_CATEGORY_ID = "cat-sport";
const OTHER_CATEGORY_ID = "cat-other-user";

function ownedWhere(ids: string[]) {
  return {
    id: { in: ids },
    category: { userId: USER_ID },
  };
}

describe("sanitizeTimeBlockIds", () => {
  it("trims, drops empties, and deduplicates", () => {
    expect(
      sanitizeTimeBlockIds([" A ", "", "B", "A", "  "]),
    ).toEqual({ ok: true, ids: ["A", "B"] });
  });

  it("rejects more unique ids than the max bulk size", () => {
    const ids = Array.from({ length: MAX_BULK_TIME_BLOCKS + 1 }, (_, i) => `tb-${i}`);
    expect(sanitizeTimeBlockIds(ids)).toEqual({ ok: false, error: "too_many" });
  });
});

describe("moveTimeBlocksToCategoryForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertCategoryOwned).mockResolvedValue({
      id: TARGET_CATEGORY_ID,
    } as Awaited<ReturnType<typeof assertCategoryOwned>>);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        timeBlock: {
          count: prisma.timeBlock.count,
          updateMany: prisma.timeBlock.updateMany,
        },
      } as never),
    );
  });

  it("moves owned TimeBlocks to an owned category", async () => {
    vi.mocked(prisma.timeBlock.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.timeBlock.updateMany).mockResolvedValue({ count: 2 });

    const result = await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ["block-a", "block-b"],
      targetCategoryId: TARGET_CATEGORY_ID,
    });

    expect(result).toEqual({ ok: true, movedCount: 2, unchanged: false });
    expect(assertCategoryOwned).toHaveBeenCalledWith(USER_ID, TARGET_CATEGORY_ID);
    expect(prisma.timeBlock.updateMany).toHaveBeenCalledWith({
      where: ownedWhere(["block-a", "block-b"]),
      data: { categoryId: TARGET_CATEGORY_ID },
    });
  });

  it("fails when the target category belongs to another user", async () => {
    vi.mocked(assertCategoryOwned).mockRejectedValue(new ScopedAccessError());

    const result = await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ["block-a"],
      targetCategoryId: OTHER_CATEGORY_ID,
    });

    expect(result).toEqual({ ok: false, error: "move_failed" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.timeBlock.updateMany).not.toHaveBeenCalled();
  });

  it("fails the whole batch when any TimeBlock is not owned", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValueOnce(1);

    const result = await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ["my-block", "other-users-block"],
      targetCategoryId: TARGET_CATEGORY_ID,
    });

    expect(result).toEqual({ ok: false, error: "move_failed" });
    expect(prisma.timeBlock.updateMany).not.toHaveBeenCalled();
  });

  it("fails when every TimeBlock belongs to another user", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValueOnce(0);

    const result = await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ["other-a", "other-b"],
      targetCategoryId: TARGET_CATEGORY_ID,
    });

    expect(result).toEqual({ ok: false, error: "move_failed" });
    expect(prisma.timeBlock.updateMany).not.toHaveBeenCalled();
  });

  it("is a no-op success for an empty id list", async () => {
    const result = await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ["", "  "],
      targetCategoryId: TARGET_CATEGORY_ID,
    });

    expect(result).toEqual({ ok: true, movedCount: 0, unchanged: true });
    expect(assertCategoryOwned).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deduplicates ids before counting and updating", async () => {
    vi.mocked(prisma.timeBlock.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.timeBlock.updateMany).mockResolvedValue({ count: 2 });

    const result = await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ["A", "A", "B"],
      targetCategoryId: TARGET_CATEGORY_ID,
    });

    expect(result).toEqual({ ok: true, movedCount: 2, unchanged: false });
    expect(prisma.timeBlock.count).toHaveBeenNthCalledWith(1, {
      where: ownedWhere(["A", "B"]),
    });
    expect(prisma.timeBlock.updateMany).toHaveBeenCalledWith({
      where: ownedWhere(["A", "B"]),
      data: { categoryId: TARGET_CATEGORY_ID },
    });
  });

  it("does not update when the unique id list exceeds the max", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `tb-${i}`);
    const result = await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ids,
      targetCategoryId: TARGET_CATEGORY_ID,
    });

    expect(result).toEqual({ ok: false, error: "too_many" });
    expect(assertCategoryOwned).not.toHaveBeenCalled();
    expect(prisma.timeBlock.updateMany).not.toHaveBeenCalled();
  });

  it("fails the same way when the target category does not exist", async () => {
    vi.mocked(assertCategoryOwned).mockRejectedValue(new ScopedAccessError());

    const result = await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ["block-a"],
      targetCategoryId: "missing-category",
    });

    expect(result).toEqual({ ok: false, error: "move_failed" });
    expect(prisma.timeBlock.updateMany).not.toHaveBeenCalled();
  });

  it("is a no-op success when all owned blocks are already in the target", async () => {
    vi.mocked(prisma.timeBlock.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2);

    const result = await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ["block-a", "block-b"],
      targetCategoryId: SOURCE_CATEGORY_ID,
    });

    expect(result).toEqual({ ok: true, movedCount: 0, unchanged: true });
    expect(prisma.timeBlock.updateMany).not.toHaveBeenCalled();
  });

  it("scopes updateMany with category.userId", async () => {
    vi.mocked(prisma.timeBlock.count)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.timeBlock.updateMany).mockResolvedValue({ count: 1 });

    await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ["block-a"],
      targetCategoryId: TARGET_CATEGORY_ID,
    });

    expect(prisma.timeBlock.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["block-a"] },
        category: { userId: USER_ID },
      },
      data: { categoryId: TARGET_CATEGORY_ID },
    });
  });

  it("fails when updateMany count does not match the unique id list", async () => {
    vi.mocked(prisma.timeBlock.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.timeBlock.updateMany).mockResolvedValue({ count: 1 });

    const result = await moveTimeBlocksToCategoryForUser({
      userId: USER_ID,
      timeBlockIds: ["block-a", "block-b"],
      targetCategoryId: TARGET_CATEGORY_ID,
    });

    expect(result).toEqual({ ok: false, error: "move_failed" });
  });
});
