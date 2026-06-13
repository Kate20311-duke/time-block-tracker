import { describe, expect, it, vi } from "vitest";
import type { StopwatchCompleteInput } from "@/lib/actions/focus-shared";
import { FocusConvertTransactionError } from "@/lib/actions/focus-shared";
import {
  appendSegmentNote,
  cancelStopwatchSegmentsInTransaction,
  completeStopwatchLegacyInTransaction,
  completeStopwatchWithSegmentsInTransaction,
  pauseStopwatchSegmentsInTransaction,
  resumeStopwatchSegmentsInTransaction,
  segmentDurationMinutes,
  startStopwatchWithSegmentInTransaction,
  type FocusSegmentRow,
  type FocusSegmentTransactionClient,
} from "@/lib/focus-segments";

const completeInput: StopwatchCompleteInput = {
  title: "Writing",
  note: "draft",
  status: "completed",
  completionLevel: 100,
};

function segment(
  overrides: Partial<FocusSegmentRow> & { id: string; startTime: Date; endTime: Date },
): FocusSegmentRow {
  return {
    focusSessionId: "focus_1",
    userId: "user_1",
    categoryId: "cat_1",
    durationMinutes: null,
    ...overrides,
  };
}

function createSegmentTx(options?: {
  segments?: FocusSegmentRow[];
  openSegment?: FocusSegmentRow | null;
  focusUpdateManyCount?: number;
}) {
  const storedSegments: FocusSegmentRow[] = [...(options?.segments ?? [])];
  let openSegment = options?.openSegment ?? null;
  if (openSegment && !storedSegments.some((s) => s.id === openSegment!.id)) {
    storedSegments.push(openSegment);
  }

  const focusSegmentCreate = vi.fn().mockImplementation(async (args) => {
    const row: FocusSegmentRow = {
      id: `seg_${storedSegments.length + 1}`,
      focusSessionId: args.data.focusSessionId,
      userId: args.data.userId,
      categoryId: args.data.categoryId,
      startTime: args.data.startTime,
      endTime: args.data.endTime ?? null,
      durationMinutes: args.data.durationMinutes ?? null,
    };
    if (row.endTime === null) {
      openSegment = row;
    }
    storedSegments.push(row);
    return { id: row.id };
  });

  const focusSegmentFindFirst = vi.fn().mockImplementation(async () => openSegment);

  const focusSegmentUpdateMany = vi.fn().mockImplementation(async (args) => {
    if (openSegment && args.data.endTime) {
      openSegment = {
        ...openSegment,
        endTime: args.data.endTime,
        durationMinutes: args.data.durationMinutes,
      };
      const idx = storedSegments.findIndex((s) => s.id === openSegment!.id);
      if (idx >= 0) {
        storedSegments[idx] = openSegment;
      }
      openSegment = null;
      return { count: 1 };
    }
    return { count: 0 };
  });

  const focusSegmentFindMany = vi.fn().mockImplementation(async () =>
    storedSegments
      .filter((s) => s.endTime !== null)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
  );

  const focusSegmentCount = vi.fn().mockResolvedValue(storedSegments.length);

  const focusSessionUpdateMany = vi
    .fn()
    .mockResolvedValue({ count: options?.focusUpdateManyCount ?? 1 });
  const focusSessionUpdate = vi.fn().mockResolvedValue({});
  const focusSessionCreate = vi.fn().mockResolvedValue({ id: "focus_new" });
  const timeBlockCreate = vi
    .fn()
    .mockImplementation(async () => ({ id: `block_${timeBlockCreate.mock.calls.length + 1}` }));

  const tx = {
    focusSegment: {
      create: focusSegmentCreate,
      findFirst: focusSegmentFindFirst,
      updateMany: focusSegmentUpdateMany,
      findMany: focusSegmentFindMany,
      count: focusSegmentCount,
    },
    focusSession: {
      create: focusSessionCreate,
      updateMany: focusSessionUpdateMany,
      update: focusSessionUpdate,
    },
    timeBlock: { create: timeBlockCreate },
  } as FocusSegmentTransactionClient & {
    focusSegment: FocusSegmentTransactionClient["focusSegment"] & {
      findFirst: ReturnType<typeof vi.fn>;
    };
    focusSession: FocusSegmentTransactionClient["focusSession"] & {
      create: ReturnType<typeof vi.fn>;
    };
    timeBlock: { create: ReturnType<typeof vi.fn> };
  };

  return {
    tx,
    storedSegments,
    focusSegmentCreate,
    focusSessionCreate,
    focusSessionUpdateMany,
    timeBlockCreate,
    setOpenSegment: (s: FocusSegmentRow | null) => {
      openSegment = s;
      if (s && !storedSegments.some((row) => row.id === s.id)) {
        storedSegments.push(s);
      }
    },
  };
}

describe("segmentDurationMinutes", () => {
  it("rounds wall-clock segment length in minutes", () => {
    expect(
      segmentDurationMinutes(
        new Date("2026-06-01T13:00:00"),
        new Date("2026-06-01T13:05:00"),
      ),
    ).toBe(5);
  });
});

describe("appendSegmentNote", () => {
  it("adds segment index when multiple segments", () => {
    expect(appendSegmentNote("note", 1, 2)).toContain("1/2");
  });

  it("omits suffix for single segment", () => {
    expect(appendSegmentNote("note", 1, 1)).toBe("note");
  });
});

describe("startStopwatchWithSegmentInTransaction", () => {
  it("creates session and first segment", async () => {
    const { tx, focusSegmentCreate, focusSessionCreate } = createSegmentTx();
    const startTime = new Date("2026-06-01T13:00:00");

    const result = await startStopwatchWithSegmentInTransaction(
      {
        title: "Study",
        note: null,
        categoryId: "cat_1",
        startTime,
        plannedDurationMinutes: 1,
        status: "running",
        mode: "stopwatch",
        pauseCount: 0,
        pausedTotalSeconds: 0,
      },
      "user_1",
      tx,
    );

    expect(result.id).toBe("focus_new");
    expect(focusSessionCreate).toHaveBeenCalled();
    expect(focusSegmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        focusSessionId: "focus_new",
        userId: "user_1",
        categoryId: "cat_1",
        startTime,
        endTime: null,
      }),
    });
  });
});

describe("pauseStopwatchSegmentsInTransaction", () => {
  it("closes segment and returns one-remaining warning on first pause", async () => {
    const { tx, focusSessionUpdateMany } = createSegmentTx({
      openSegment: segment({
        id: "seg_1",
        startTime: new Date("2026-06-01T13:00:00"),
        endTime: null as unknown as Date,
      }),
    });
    (focusSessionUpdateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    const result = await pauseStopwatchSegmentsInTransaction(
      { id: "focus_1", pauseCount: 0 },
      new Date("2026-06-01T13:05:00"),
      "user_1",
      tx,
    );

    expect(result).toEqual({ ok: true, warning: "pause_remaining_one" });
    expect(focusSessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pauseCount: 1, status: "paused" }),
      }),
    );
  });

  it("returns final warning on second pause", async () => {
    const { tx } = createSegmentTx({
      openSegment: segment({
        id: "seg_2",
        startTime: new Date("2026-06-01T13:35:00"),
        endTime: null as unknown as Date,
      }),
    });

    const result = await pauseStopwatchSegmentsInTransaction(
      { id: "focus_1", pauseCount: 1 },
      new Date("2026-06-01T14:00:00"),
      "user_1",
      tx,
    );

    expect(result).toEqual({ ok: true, warning: "pause_final" });
  });

  it("marks session failed on third pause attempt", async () => {
    const { tx, focusSessionUpdateMany } = createSegmentTx({
      openSegment: segment({
        id: "seg_3",
        startTime: new Date("2026-06-01T14:30:00"),
        endTime: null as unknown as Date,
      }),
    });

    const result = await pauseStopwatchSegmentsInTransaction(
      { id: "focus_1", pauseCount: 2 },
      new Date("2026-06-01T14:45:00"),
      "user_1",
      tx,
    );

    expect(result).toEqual({ ok: false, reason: "pause_limit_exceeded" });
    expect(focusSessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed" }),
      }),
    );
  });
});

describe("resumeStopwatchSegmentsInTransaction", () => {
  it("creates a new segment on resume", async () => {
    const { tx, focusSegmentCreate } = createSegmentTx();
    const now = new Date("2026-06-01T13:35:00");

    await resumeStopwatchSegmentsInTransaction(
      {
        id: "focus_1",
        categoryId: "cat_1",
        userId: "user_1",
        startTime: new Date("2026-06-01T13:00:00"),
        status: "paused",
        pausedAt: new Date("2026-06-01T13:05:00"),
        pausedTotalSeconds: 0,
      },
      now,
      "user_1",
      tx,
    );

    expect(focusSegmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        focusSessionId: "focus_1",
        startTime: now,
        endTime: null,
      }),
    });
  });
});

describe("completeStopwatchWithSegmentsInTransaction", () => {
  it("creates one TimeBlock per segment with wall-clock times", async () => {
    const { tx, timeBlockCreate } = createSegmentTx({
      segments: [
        segment({
          id: "seg_1",
          startTime: new Date("2026-06-01T13:00:00"),
          endTime: new Date("2026-06-01T13:05:00"),
          durationMinutes: 5,
        }),
        segment({
          id: "seg_2",
          startTime: new Date("2026-06-01T13:35:00"),
          endTime: new Date("2026-06-01T14:30:00"),
          durationMinutes: 55,
        }),
      ],
    });

    const result = await completeStopwatchWithSegmentsInTransaction(
      {
        id: "focus_1",
        note: "draft",
        categoryId: "cat_1",
        status: "paused",
      },
      completeInput,
      new Date("2026-06-01T14:30:00"),
      "user_1",
      tx,
    );

    expect(result.timeBlockIds).toHaveLength(2);
    expect(result.actualDurationMinutes).toBe(60);
    expect(timeBlockCreate).toHaveBeenCalledTimes(2);
    expect(timeBlockCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        startTime: new Date("2026-06-01T13:00:00"),
        endTime: new Date("2026-06-01T13:05:00"),
        focusSegmentId: "seg_1",
        source: "stopwatch",
      }),
    });
    expect(timeBlockCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        startTime: new Date("2026-06-01T13:35:00"),
        endTime: new Date("2026-06-01T14:30:00"),
        focusSegmentId: "seg_2",
      }),
    });
  });

  it("rejects failed sessions", async () => {
    const { tx } = createSegmentTx();
    await expect(
      completeStopwatchWithSegmentsInTransaction(
        {
          id: "focus_1",
          note: null,
          categoryId: "cat_1",
          status: "failed",
        },
        completeInput,
        new Date(),
        "user_1",
        tx,
      ),
    ).rejects.toBeInstanceOf(FocusConvertTransactionError);
  });

  it("closes open segment when completing while running", async () => {
    const { tx, timeBlockCreate } = createSegmentTx({
      openSegment: segment({
        id: "seg_open",
        startTime: new Date("2026-06-01T13:00:00"),
        endTime: null as unknown as Date,
      }),
    });

    await completeStopwatchWithSegmentsInTransaction(
      {
        id: "focus_1",
        note: null,
        categoryId: "cat_1",
        status: "running",
      },
      completeInput,
      new Date("2026-06-01T13:10:00"),
      "user_1",
      tx,
    );

    expect(timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startTime: new Date("2026-06-01T13:00:00"),
        endTime: new Date("2026-06-01T13:10:00"),
      }),
    });
  });
});

describe("completeStopwatchLegacyInTransaction", () => {
  it("uses compressed active duration for sessions without segments", async () => {
    const { tx, timeBlockCreate } = createSegmentTx();

    await completeStopwatchLegacyInTransaction(
      {
        id: "focus_legacy",
        note: null,
        categoryId: "cat_1",
        status: "running",
        startTime: new Date("2026-06-01T10:00:00"),
        pausedAt: null,
        pausedTotalSeconds: 600,
      },
      completeInput,
      new Date("2026-06-01T10:30:00"),
      "user_1",
      tx,
    );

    expect(timeBlockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        startTime: new Date("2026-06-01T10:00:00"),
        endTime: new Date("2026-06-01T10:20:00"),
      }),
    });
  });

  it("rejects failed legacy sessions", async () => {
    const { tx } = createSegmentTx();
    await expect(
      completeStopwatchLegacyInTransaction(
        {
          id: "focus_1",
          note: null,
          categoryId: "cat_1",
          status: "failed",
          startTime: new Date(),
          pausedAt: null,
          pausedTotalSeconds: 0,
        },
        completeInput,
        new Date(),
        "user_1",
        tx,
      ),
    ).rejects.toBeInstanceOf(FocusConvertTransactionError);
  });
});

describe("cancelStopwatchSegmentsInTransaction", () => {
  it("abandons without creating TimeBlocks", async () => {
    const { tx, timeBlockCreate, focusSessionUpdateMany } = createSegmentTx({
      openSegment: segment({
        id: "seg_1",
        startTime: new Date("2026-06-01T13:00:00"),
        endTime: null as unknown as Date,
      }),
    });

    await cancelStopwatchSegmentsInTransaction(
      {
        id: "focus_1",
        status: "running",
        startTime: new Date("2026-06-01T13:00:00"),
        pausedAt: null,
        pausedTotalSeconds: 0,
      },
      new Date("2026-06-01T13:10:00"),
      "user_1",
      tx,
    );

    expect(timeBlockCreate).not.toHaveBeenCalled();
    expect(focusSessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "abandoned" }),
      }),
    );
  });
});
