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
    focusSegment: {
      count: vi.fn().mockResolvedValue(0),
    },
  } as StopwatchCompleteTransactionClient & {
    timeBlockCreate: ReturnType<typeof vi.fn>;
    focusUpdateMany: ReturnType<typeof vi.fn>;
    focusUpdate: ReturnType<typeof vi.fn>;
    focusSegment: { count: ReturnType<typeof vi.fn> };
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
        category: { userId: "user_1" },
      },
      data: expect.objectContaining({
        status: "completed",
        convertedToTimeBlock: true,
        actualDurationMinutes: 25,
        endTime,
      }),
    });
    expect(tx.timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "stopwatch",
        status: "completed",
        completionLevel: 100,
        title: "Writing",
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
});
