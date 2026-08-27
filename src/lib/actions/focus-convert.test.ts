import { describe, expect, it, vi } from "vitest";
import {
  convertFocusSessionInTransaction,
  FocusConvertTransactionError,
  type FocusConvertTransactionClient,
} from "./focus-shared";

const session = {
  id: "focus_1",
  note: null,
  categoryId: "cat_study",
};

const range = {
  start: new Date("2026-05-21T10:00:00"),
  end: new Date("2026-05-21T10:25:00"),
};

function createMockTx(options?: {
  claimCount?: number;
  blockId?: string;
}): FocusConvertTransactionClient & {
  timeBlockCreate: ReturnType<typeof vi.fn>;
  focusUpdateMany: ReturnType<typeof vi.fn>;
  focusUpdate: ReturnType<typeof vi.fn>;
} {
  const timeBlockCreate = vi.fn().mockResolvedValue({
    id: options?.blockId ?? "block_1",
  });
  const focusUpdateMany = vi
    .fn()
    .mockResolvedValue({ count: options?.claimCount ?? 1 });
  const focusUpdate = vi.fn().mockResolvedValue({});

  return {
    timeBlockCreate,
    focusUpdateMany,
    focusUpdate,
    timeBlock: { create: timeBlockCreate },
    focusSession: {
      updateMany: focusUpdateMany,
      update: focusUpdate,
    },
  };
}

describe("convertFocusSessionInTransaction", () => {
  it("claims conversion before creating a TimeBlock", async () => {
    const tx = createMockTx();
    const order: string[] = [];
    tx.focusUpdateMany.mockImplementation(async () => {
      order.push("claim");
      return { count: 1 };
    });
    tx.timeBlockCreate.mockImplementation(async () => {
      order.push("create");
      return { id: "block_1" };
    });

    await convertFocusSessionInTransaction(session, "Focus", range, "user_1", tx);

    expect(order).toEqual(["claim", "create"]);
    expect(tx.focusUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "focus_1",
        convertedToTimeBlock: false,
        status: "completed",
        userId: "user_1",
      },
      data: {
        status: "converted",
        convertedToTimeBlock: true,
      },
    });
    expect(tx.focusUpdateMany.mock.calls[0][0].where).not.toHaveProperty(
      "category",
    );
    expect(tx.timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "pomodoro",
        categoryId: "cat_study",
      }),
    });
    expect(tx.timeBlockCreate).toHaveBeenCalledTimes(1);
    expect(tx.focusUpdate).toHaveBeenCalledWith({
      where: { id: "focus_1" },
      data: { timeBlockId: "block_1" },
    });
  });

  it("returns timeBlockId after successful conversion", async () => {
    const tx = createMockTx({ blockId: "block_99" });
    const result = await convertFocusSessionInTransaction(
      session,
      "Focus",
      range,
      "user_1",
      tx,
    );
    expect(result.timeBlockId).toBe("block_99");
  });

  it("does not create a TimeBlock when claim fails (already converted)", async () => {
    const tx = createMockTx({ claimCount: 0 });

    await expect(
      convertFocusSessionInTransaction(session, "Focus", range, "user_1", tx),
    ).rejects.toBeInstanceOf(FocusConvertTransactionError);

    expect(tx.timeBlockCreate).not.toHaveBeenCalled();
    expect(tx.focusUpdate).not.toHaveBeenCalled();
  });

  it("simulates double conversion: second claim fails with no extra block", async () => {
    const tx = createMockTx();
    tx.focusUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await convertFocusSessionInTransaction(session, "Focus", range, "user_1", tx);
    await expect(
      convertFocusSessionInTransaction(session, "Focus", range, "user_1", tx),
    ).rejects.toMatchObject({ code: "already_converted" });

    expect(tx.timeBlockCreate).toHaveBeenCalledTimes(1);
  });

  it("does not link timeBlockId when TimeBlock create fails", async () => {
    const tx = createMockTx();
    tx.timeBlockCreate.mockRejectedValue(new Error("db error"));

    await expect(
      convertFocusSessionInTransaction(session, "Focus", range, "user_1", tx),
    ).rejects.toThrow("db error");

    expect(tx.focusUpdate).not.toHaveBeenCalled();
  });

  it("does not keep a converted claim when linking the TimeBlock fails", async () => {
    const tx = createMockTx();
    tx.focusUpdate.mockRejectedValue(new Error("link failed"));

    await expect(
      convertFocusSessionInTransaction(session, "Focus", range, "user_1", tx),
    ).rejects.toThrow("link failed");

    expect(tx.timeBlockCreate).toHaveBeenCalledTimes(1);
  });
});

describe("convertFocusSessionInTransaction null category", () => {
  it("fails before claiming or creating a TimeBlock", async () => {
    const tx = createMockTx();

    await expect(
      convertFocusSessionInTransaction(
        { id: "focus_1", note: null, categoryId: null },
        "Focus",
        range,
        "user_1",
        tx,
      ),
    ).rejects.toMatchObject({ code: "needs_category" });

    expect(tx.focusUpdateMany).not.toHaveBeenCalled();
    expect(tx.timeBlockCreate).not.toHaveBeenCalled();
    expect(tx.focusUpdate).not.toHaveBeenCalled();
  });

  it("creates a TimeBlock on the target category and does not write session.categoryId", async () => {
    const tx = createMockTx();

    await convertFocusSessionInTransaction(
      { id: "focus_1", note: null, categoryId: null },
      "Focus",
      range,
      "user_1",
      tx,
      "cat_work",
    );

    expect(tx.timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        categoryId: "cat_work",
        source: "pomodoro",
      }),
    });
    expect(tx.focusUpdateMany.mock.calls[0][0].data).not.toHaveProperty(
      "categoryId",
    );
    expect(tx.focusUpdate.mock.calls[0][0].data).not.toHaveProperty("categoryId");
  });

  it("ignores a forged target when the session still has a category", async () => {
    const tx = createMockTx();

    await convertFocusSessionInTransaction(
      session,
      "Focus",
      range,
      "user_1",
      tx,
      "cat_other",
    );

    expect(tx.timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ categoryId: "cat_study" }),
    });
  });

  it("second convert of an orphan session still fails without a second TimeBlock", async () => {
    const tx = createMockTx();
    tx.focusUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await convertFocusSessionInTransaction(
      { id: "focus_1", note: null, categoryId: null },
      "Focus",
      range,
      "user_1",
      tx,
      "cat_work",
    );
    await expect(
      convertFocusSessionInTransaction(
        { id: "focus_1", note: null, categoryId: null },
        "Focus",
        range,
        "user_1",
        tx,
        "cat_work",
      ),
    ).rejects.toMatchObject({ code: "already_converted" });

    expect(tx.timeBlockCreate).toHaveBeenCalledTimes(1);
  });
});
