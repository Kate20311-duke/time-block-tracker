import { describe, expect, it, vi } from "vitest";
import {
  completeStopwatchInTransaction,
  FocusConvertTransactionError,
  type StopwatchCompleteTransactionClient,
} from "./focus-shared";

const session = {
  id: "focus_sw_1",
  title: "Writing",
  note: "draft",
  categoryId: "cat_1",
  startTime: new Date("2026-06-01T10:00:00"),
};

const endTime = new Date("2026-06-01T10:25:00");

function createMockTx(options?: {
  claimCount?: number;
  blockId?: string;
}): StopwatchCompleteTransactionClient & {
  timeBlockCreate: ReturnType<typeof vi.fn>;
  focusUpdateMany: ReturnType<typeof vi.fn>;
  focusUpdate: ReturnType<typeof vi.fn>;
} {
  const timeBlockCreate = vi.fn().mockResolvedValue({
    id: options?.blockId ?? "block_sw_1",
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

describe("completeStopwatchInTransaction", () => {
  it("claims running stopwatch before creating TimeBlock", async () => {
    const tx = createMockTx();
    const order: string[] = [];
    tx.focusUpdateMany.mockImplementation(async () => {
      order.push("claim");
      return { count: 1 };
    });
    tx.timeBlockCreate.mockImplementation(async () => {
      order.push("create");
      return { id: "block_sw_1" };
    });

    await completeStopwatchInTransaction(
      session,
      "Writing",
      endTime,
      "user_1",
      tx,
    );

    expect(order).toEqual(["claim", "create"]);
    expect(tx.focusUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "focus_sw_1",
        convertedToTimeBlock: false,
        status: "running",
        mode: "stopwatch",
        category: { userId: "user_1" },
      },
      data: expect.objectContaining({
        status: "completed",
        convertedToTimeBlock: true,
        actualDurationMinutes: 25,
      }),
    });
    expect(tx.timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "stopwatch",
        status: "completed",
        completionLevel: 100,
        title: "Writing",
      }),
    });
  });

  it("throws already_converted when claim fails (double end)", async () => {
    const tx = createMockTx({ claimCount: 0 });
    await expect(
      completeStopwatchInTransaction(session, "Writing", endTime, "user_1", tx),
    ).rejects.toBeInstanceOf(FocusConvertTransactionError);
    expect(tx.timeBlockCreate).not.toHaveBeenCalled();
  });
});
