import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    timeBlock: {
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    focusSession: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    focusSegment: {
      deleteMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { MAX_BULK_TIME_BLOCKS } from "@/lib/category-time-block-bulk";
import { deleteTimeBlocksForUser } from "./category-time-block-delete";

const USER_ID = "user-1";

function ownedWhere(ids: string[]) {
  return {
    id: { in: ids },
    category: { userId: USER_ID },
  };
}

describe("deleteTimeBlocksForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        timeBlock: {
          count: prisma.timeBlock.count,
          deleteMany: prisma.timeBlock.deleteMany,
        },
      } as never),
    );
  });

  it("deletes owned TimeBlocks", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValue(2);
    vi.mocked(prisma.timeBlock.deleteMany).mockResolvedValue({ count: 2 });

    const result = await deleteTimeBlocksForUser({
      userId: USER_ID,
      timeBlockIds: ["block-a", "block-b"],
    });

    expect(result).toEqual({ ok: true, deletedCount: 2, unchanged: false });
    expect(prisma.timeBlock.deleteMany).toHaveBeenCalledWith({
      where: ownedWhere(["block-a", "block-b"]),
    });
    expect(prisma.focusSession.deleteMany).not.toHaveBeenCalled();
    expect(prisma.focusSession.updateMany).not.toHaveBeenCalled();
    expect(prisma.focusSession.delete).not.toHaveBeenCalled();
    expect(prisma.focusSegment.deleteMany).not.toHaveBeenCalled();
    expect(prisma.focusSegment.delete).not.toHaveBeenCalled();
  });

  it("fails the whole batch when any TimeBlock is not owned", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValue(1);

    const result = await deleteTimeBlocksForUser({
      userId: USER_ID,
      timeBlockIds: ["my-block", "other-users-block"],
    });

    expect(result).toEqual({ ok: false, error: "delete_failed" });
    expect(prisma.timeBlock.deleteMany).not.toHaveBeenCalled();
  });

  it("fails when every TimeBlock belongs to another user", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValue(0);

    const result = await deleteTimeBlocksForUser({
      userId: USER_ID,
      timeBlockIds: ["other-a", "other-b"],
    });

    expect(result).toEqual({ ok: false, error: "delete_failed" });
    expect(prisma.timeBlock.deleteMany).not.toHaveBeenCalled();
  });

  it("fails the whole batch when a nonexistent id is mixed in", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValue(1);

    const result = await deleteTimeBlocksForUser({
      userId: USER_ID,
      timeBlockIds: ["my-block", "missing-id"],
    });

    expect(result).toEqual({ ok: false, error: "delete_failed" });
    expect(prisma.timeBlock.deleteMany).not.toHaveBeenCalled();
  });

  it("is a no-op success for an empty id list", async () => {
    const result = await deleteTimeBlocksForUser({
      userId: USER_ID,
      timeBlockIds: ["", "  "],
    });

    expect(result).toEqual({ ok: true, deletedCount: 0, unchanged: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.timeBlock.deleteMany).not.toHaveBeenCalled();
  });

  it("deduplicates ids before counting and deleting", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValue(2);
    vi.mocked(prisma.timeBlock.deleteMany).mockResolvedValue({ count: 2 });

    const result = await deleteTimeBlocksForUser({
      userId: USER_ID,
      timeBlockIds: ["A", "A", "B"],
    });

    expect(result).toEqual({ ok: true, deletedCount: 2, unchanged: false });
    expect(prisma.timeBlock.count).toHaveBeenCalledWith({
      where: ownedWhere(["A", "B"]),
    });
    expect(prisma.timeBlock.deleteMany).toHaveBeenCalledWith({
      where: ownedWhere(["A", "B"]),
    });
  });

  it("does not delete when the unique id list exceeds the max", async () => {
    const ids = Array.from({ length: MAX_BULK_TIME_BLOCKS + 1 }, (_, i) => `tb-${i}`);
    const result = await deleteTimeBlocksForUser({
      userId: USER_ID,
      timeBlockIds: ids,
    });

    expect(result).toEqual({ ok: false, error: "too_many" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.timeBlock.deleteMany).not.toHaveBeenCalled();
  });

  it("scopes deleteMany with category.userId", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValue(1);
    vi.mocked(prisma.timeBlock.deleteMany).mockResolvedValue({ count: 1 });

    await deleteTimeBlocksForUser({
      userId: USER_ID,
      timeBlockIds: ["block-a"],
    });

    expect(prisma.timeBlock.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["block-a"] },
        category: { userId: USER_ID },
      },
    });
  });

  it("fails and aborts the transaction when deleteMany count does not match", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValue(2);
    vi.mocked(prisma.timeBlock.deleteMany).mockResolvedValue({ count: 1 });
    let transactionAborted = false;
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      try {
        return await callback({
          timeBlock: {
            count: prisma.timeBlock.count,
            deleteMany: prisma.timeBlock.deleteMany,
          },
        } as never);
      } catch (error) {
        transactionAborted = true;
        throw error;
      }
    });

    const result = await deleteTimeBlocksForUser({
      userId: USER_ID,
      timeBlockIds: ["block-a", "block-b"],
    });

    expect(result).toEqual({ ok: false, error: "delete_failed" });
    expect(prisma.timeBlock.deleteMany).toHaveBeenCalled();
    expect(transactionAborted).toBe(true);
  });
});
