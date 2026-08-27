import { describe, expect, it, vi } from "vitest";
import {
  completeStopwatchInTransaction,
  FocusConvertTransactionError,
  type StopwatchCompleteInput,
  type StopwatchCompleteTransactionClient,
} from "./focus-shared";

const baseSession = {
  id: "focus_sw_1",
  note: "draft",
  categoryId: "cat_1",
  startTime: new Date("2026-06-01T10:00:00"),
  status: "running",
  pausedAt: null,
  pausedTotalSeconds: 0,
};

const completeInput: StopwatchCompleteInput = {
  title: "Writing",
  note: "draft",
  status: "completed",
  completionLevel: 100,
};

const endTime = new Date("2026-06-01T10:25:00");

function createMockTx(options?: {
  claimCount?: number;
  blockId?: string;
}): StopwatchCompleteTransactionClient & {
  timeBlockCreate: ReturnType<typeof vi.fn>;
  focusUpdateMany: ReturnType<typeof vi.fn>;
  focusUpdate: ReturnType<typeof vi.fn>;
  focusSegmentCount: ReturnType<typeof vi.fn>;
} {
  const timeBlockCreate = vi.fn().mockResolvedValue({
    id: options?.blockId ?? "block_sw_1",
  });
  const focusUpdateMany = vi
    .fn()
    .mockResolvedValue({ count: options?.claimCount ?? 1 });
  const focusUpdate = vi.fn().mockResolvedValue({});
  const focusSegmentCount = vi.fn().mockResolvedValue(0);

  return {
    timeBlockCreate,
    focusUpdateMany,
    focusUpdate,
    focusSegmentCount,
    timeBlock: { create: timeBlockCreate },
    focusSession: {
      updateMany: focusUpdateMany,
      update: focusUpdate,
    },
    focusSegment: {
      count: focusSegmentCount,
    },
  } as StopwatchCompleteTransactionClient & {
    timeBlockCreate: ReturnType<typeof vi.fn>;
    focusUpdateMany: ReturnType<typeof vi.fn>;
    focusUpdate: ReturnType<typeof vi.fn>;
    focusSegmentCount: ReturnType<typeof vi.fn>;
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
      baseSession,
      completeInput,
      endTime,
      "user_1",
      tx,
    );

    expect(order).toEqual(["claim", "create"]);
    expect(tx.focusUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "focus_sw_1",
        convertedToTimeBlock: false,
        status: { in: ["running", "paused"] },
        mode: "stopwatch",
        userId: "user_1",
      },
      data: expect.objectContaining({
        status: "completed",
        convertedToTimeBlock: true,
        actualDurationMinutes: 25,
        endTime,
      }),
    });
    expect(tx.focusUpdateMany.mock.calls[0][0].where).not.toHaveProperty(
      "category",
    );
    expect(tx.timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "stopwatch",
        status: "completed",
        completionLevel: 100,
        title: "Writing",
        categoryId: "cat_1",
        startTime: baseSession.startTime,
        endTime: new Date("2026-06-01T10:25:00"),
      }),
    });
  });

  it("uses active duration when completing a paused stopwatch", async () => {
    const tx = createMockTx();
    const pausedSession = {
      ...baseSession,
      status: "paused",
      pausedAt: new Date("2026-06-01T10:20:00"),
      pausedTotalSeconds: 300,
    };
    const wallClockEnd = new Date("2026-06-01T10:30:00");

    await completeStopwatchInTransaction(
      pausedSession,
      completeInput,
      wallClockEnd,
      "user_1",
      tx,
    );

    expect(tx.timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        endTime: new Date("2026-06-01T10:15:00"),
        startTime: pausedSession.startTime,
      }),
    });
    expect(tx.focusUpdateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: { in: ["running", "paused"] },
      }),
      data: expect.objectContaining({
        actualDurationMinutes: 15,
        pausedTotalSeconds: 900,
      }),
    });
  });

  it("throws already_converted when claim fails (double end)", async () => {
    const tx = createMockTx({ claimCount: 0 });
    await expect(
      completeStopwatchInTransaction(
        baseSession,
        completeInput,
        endTime,
        "user_1",
        tx,
      ),
    ).rejects.toBeInstanceOf(FocusConvertTransactionError);
    expect(tx.timeBlockCreate).not.toHaveBeenCalled();
  });

  it("does not link a TimeBlock when create fails after claim", async () => {
    const tx = createMockTx();
    tx.timeBlockCreate.mockRejectedValue(new Error("db error"));

    await expect(
      completeStopwatchInTransaction(
        baseSession,
        completeInput,
        endTime,
        "user_1",
        tx,
      ),
    ).rejects.toThrow("db error");

    expect(tx.focusUpdate).not.toHaveBeenCalled();
  });
});

describe("completeStopwatchInTransaction null category", () => {
  it("fails before claiming the session or creating a TimeBlock", async () => {
    const tx = createMockTx();

    await expect(
      completeStopwatchInTransaction(
        { ...baseSession, categoryId: null },
        completeInput,
        endTime,
        "user_1",
        tx,
      ),
    ).rejects.toMatchObject({ code: "needs_category" });

    expect(tx.focusUpdateMany).not.toHaveBeenCalled();
    expect(tx.timeBlockCreate).not.toHaveBeenCalled();
    expect(tx.focusSegmentCount).not.toHaveBeenCalled();
  });

  it("creates a TimeBlock on the target category and does not write session.categoryId", async () => {
    const tx = createMockTx();

    await completeStopwatchInTransaction(
      { ...baseSession, categoryId: null },
      completeInput,
      endTime,
      "user_1",
      tx,
      { timeBlockCategoryId: "cat_work" },
    );

    expect(tx.timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        categoryId: "cat_work",
        source: "stopwatch",
      }),
    });
    expect(tx.focusUpdateMany.mock.calls[0][0].data).not.toHaveProperty(
      "categoryId",
    );
  });

  it("ignores a forged target when the session still has a category", async () => {
    const tx = createMockTx();

    await completeStopwatchInTransaction(
      baseSession,
      completeInput,
      endTime,
      "user_1",
      tx,
      { timeBlockCategoryId: "cat_other" },
    );

    expect(tx.timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ categoryId: "cat_1" }),
    });
  });
});
