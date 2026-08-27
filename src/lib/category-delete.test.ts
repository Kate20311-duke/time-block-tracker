import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/scoped", () => ({
  assertCategoryOwned: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    timeBlock: {
      count: vi.fn(),
    },
    category: {
      deleteMany: vi.fn(),
      delete: vi.fn(),
    },
    focusSession: {
      deleteMany: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    focusSegment: {
      deleteMany: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { assertCategoryOwned } from "@/lib/db/scoped";
import { ScopedAccessError } from "@/lib/db/scoped-errors";
import { prisma } from "@/lib/prisma";
import { deleteCategoryForUser } from "./category-delete";

const USER_A = "user-a";
const USER_B = "user-b";
const CATEGORY_A = "cat-a";

function expectNoFocusDeletes() {
  expect(prisma.focusSession.deleteMany).not.toHaveBeenCalled();
  expect(prisma.focusSession.delete).not.toHaveBeenCalled();
  expect(prisma.focusSession.updateMany).not.toHaveBeenCalled();
  expect(prisma.focusSegment.deleteMany).not.toHaveBeenCalled();
  expect(prisma.focusSegment.delete).not.toHaveBeenCalled();
  expect(prisma.focusSegment.updateMany).not.toHaveBeenCalled();
}

describe("deleteCategoryForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertCategoryOwned).mockResolvedValue({
      id: CATEGORY_A,
      userId: USER_A,
    } as never);
    vi.mocked(prisma.timeBlock.count).mockResolvedValue(0);
    vi.mocked(prisma.category.deleteMany).mockResolvedValue({ count: 1 });
  });

  it("rejects delete when the category still has a TimeBlock", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValue(1);

    const result = await deleteCategoryForUser({
      userId: USER_A,
      categoryId: CATEGORY_A,
    });

    expect(result).toEqual({ ok: false, error: "has_time_blocks" });
    expect(prisma.category.deleteMany).not.toHaveBeenCalled();
    expectNoFocusDeletes();
  });

  it("deletes an empty category with no TimeBlocks or FocusSessions", async () => {
    const result = await deleteCategoryForUser({
      userId: USER_A,
      categoryId: CATEGORY_A,
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.timeBlock.count).toHaveBeenCalledWith({
      where: {
        AND: [{ category: { userId: USER_A } }, { categoryId: CATEGORY_A }],
      },
    });
    expect(prisma.category.deleteMany).toHaveBeenCalledWith({
      where: { id: CATEGORY_A, userId: USER_A },
    });
    expectNoFocusDeletes();
  });

  it.each([
    "abandoned",
    "completed",
    "failed",
    "running",
    "paused",
    "planned",
    "converted",
  ] as const)(
    "allows delete when TimeBlock count is 0 even if FocusSession status is %s",
    async () => {
      const result = await deleteCategoryForUser({
        userId: USER_A,
        categoryId: CATEGORY_A,
      });

      expect(result).toEqual({ ok: true });
      expect(prisma.category.deleteMany).toHaveBeenCalledTimes(1);
      expectNoFocusDeletes();
    },
  );

  it("allows delete with mixed Focus statuses when TimeBlock count is 0", async () => {
    const result = await deleteCategoryForUser({
      userId: USER_A,
      categoryId: CATEGORY_A,
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.focusSession.count).not.toHaveBeenCalled();
    expectNoFocusDeletes();
  });

  it("does not delete FocusSegments when deleting a category that had a paused session", async () => {
    const result = await deleteCategoryForUser({
      userId: USER_A,
      categoryId: CATEGORY_A,
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.focusSegment.deleteMany).not.toHaveBeenCalled();
    expect(prisma.focusSegment.delete).not.toHaveBeenCalled();
  });

  it("allows delete after converted TimeBlocks were moved away", async () => {
    vi.mocked(prisma.timeBlock.count).mockResolvedValue(0);

    const result = await deleteCategoryForUser({
      userId: USER_A,
      categoryId: CATEGORY_A,
    });

    expect(result).toEqual({ ok: true });
    expectNoFocusDeletes();
  });

  it("rejects another user's category without deleting", async () => {
    vi.mocked(assertCategoryOwned).mockRejectedValue(new ScopedAccessError());

    const result = await deleteCategoryForUser({
      userId: USER_A,
      categoryId: "cat-owned-by-b",
    });

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(assertCategoryOwned).toHaveBeenCalledWith(USER_A, "cat-owned-by-b");
    expect(prisma.timeBlock.count).not.toHaveBeenCalled();
    expect(prisma.category.deleteMany).not.toHaveBeenCalled();
    expectNoFocusDeletes();
  });

  it("does not leak whether a missing category exists for another user", async () => {
    vi.mocked(assertCategoryOwned).mockRejectedValue(new ScopedAccessError());

    const missing = await deleteCategoryForUser({
      userId: USER_A,
      categoryId: "does-not-exist",
    });
    const otherUser = await deleteCategoryForUser({
      userId: USER_A,
      categoryId: USER_B,
    });

    expect(missing).toEqual({ ok: false, error: "not_found" });
    expect(otherUser).toEqual({ ok: false, error: "not_found" });
  });

  it("returns a controlled failure when Category delete hits a constraint", async () => {
    vi.mocked(prisma.category.deleteMany).mockRejectedValue({
      code: "P2003",
      message: "Foreign key constraint violated on TimeBlock_categoryId_fkey",
    });

    const result = await deleteCategoryForUser({
      userId: USER_A,
      categoryId: CATEGORY_A,
    });

    expect(result).toEqual({ ok: false, error: "delete_failed" });
    expectNoFocusDeletes();
  });

  it("never calls category.delete (unscoped by id) or Focus deleteMany", async () => {
    await deleteCategoryForUser({
      userId: USER_A,
      categoryId: CATEGORY_A,
    });

    expect(prisma.category.delete).not.toHaveBeenCalled();
    expectNoFocusDeletes();
  });
});
