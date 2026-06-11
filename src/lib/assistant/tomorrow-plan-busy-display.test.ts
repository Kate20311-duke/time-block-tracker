import { describe, expect, it } from "vitest";

import {
  busyBlocksOverlap,
  formatDisplayBusySources,
  getAvailableWindows,
  mergeBusyBlocksForDisplay,
} from "@/lib/assistant/tomorrow-plan-busy-display";
import { toTimeInterval } from "@/lib/assistant/tomorrow-plan-busy";

const TIME_ZONE = "Asia/Shanghai";
const DATE = "2026-06-11";

const SOURCE_LABELS = {
  calendar: "日历",
  routine: "固定安排",
  both: "日历 + 固定安排",
};

describe("mergeBusyBlocksForDisplay", () => {
  it("merges existing and routine blocks with same title/start/end", () => {
    const merged = mergeBusyBlocksForDisplay({
      existingBlocks: [
        {
          id: "tb-1",
          title: "上班",
          categoryId: "cat-1",
          categoryName: "工作",
          startTime: "2026-06-11T01:00:00.000Z",
          endTime: "2026-06-11T09:00:00.000Z",
        },
      ],
      routineBlocks: [
        {
          routineId: "r-1",
          title: "上班",
          categoryId: "cat-1",
          categoryName: "工作",
          startTime: "2026-06-11T01:00:00.000Z",
          endTime: "2026-06-11T09:00:00.000Z",
          daysOfWeek: [1, 2, 3, 4, 5],
        },
      ],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]?.sources).toEqual(["timeBlock", "routine"]);
    expect(formatDisplayBusySources(merged[0]!.sources, SOURCE_LABELS)).toBe(
      "日历 + 固定安排",
    );
  });

  it("keeps timeBlock-only source", () => {
    const merged = mergeBusyBlocksForDisplay({
      existingBlocks: [
        {
          id: "tb-1",
          title: "会议",
          categoryId: "cat-1",
          categoryName: "工作",
          startTime: "2026-06-11T02:00:00.000Z",
          endTime: "2026-06-11T03:00:00.000Z",
        },
      ],
      routineBlocks: [],
    });

    expect(merged[0]?.sources).toEqual(["timeBlock"]);
    expect(formatDisplayBusySources(merged[0]!.sources, SOURCE_LABELS)).toBe(
      "日历",
    );
  });

  it("keeps routine-only source", () => {
    const merged = mergeBusyBlocksForDisplay({
      existingBlocks: [],
      routineBlocks: [
        {
          routineId: "r-1",
          title: "背单词",
          categoryId: "cat-1",
          categoryName: "学习",
          startTime: "2026-06-11T23:00:00.000Z",
          endTime: "2026-06-12T00:00:00.000Z",
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        },
      ],
    });

    expect(merged[0]?.sources).toEqual(["routine"]);
    expect(formatDisplayBusySources(merged[0]!.sources, SOURCE_LABELS)).toBe(
      "固定安排",
    );
  });
});

describe("getAvailableWindows", () => {
  it("computes free windows between busy blocks", () => {
    const busyBlocks = mergeBusyBlocksForDisplay({
      existingBlocks: [],
      routineBlocks: [
        {
          routineId: "r-1",
          title: "背单词",
          categoryId: "cat-1",
          categoryName: "学习",
          startTime: "2026-06-11T23:00:00.000Z",
          endTime: "2026-06-12T00:00:00.000Z",
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        },
        {
          routineId: "r-2",
          title: "上班",
          categoryId: "cat-1",
          categoryName: "工作",
          startTime: "2026-06-11T01:00:00.000Z",
          endTime: "2026-06-11T09:00:00.000Z",
          daysOfWeek: [1, 2, 3, 4, 5],
        },
      ],
    });

    const windows = getAvailableWindows({
      busyBlocks,
      date: DATE,
      timeZone: TIME_ZONE,
    });

    expect(windows.length).toBeGreaterThanOrEqual(2);
    for (const window of windows) {
      expect(window.minutes).toBeGreaterThanOrEqual(30);
    }

    const firstWindowStart = new Date(windows[0]!.startTime).getTime();
    const workStart = new Date("2026-06-11T23:00:00.000Z").getTime();
    expect(firstWindowStart).toBeLessThan(workStart);
  });

  it("ignores gaps shorter than 30 minutes", () => {
    const busyBlocks = mergeBusyBlocksForDisplay({
      existingBlocks: [
        {
          id: "tb-1",
          title: "A",
          categoryId: "cat-1",
          categoryName: "工作",
          startTime: "2026-06-11T00:00:00.000Z",
          endTime: "2026-06-11T00:20:00.000Z",
        },
        {
          id: "tb-2",
          title: "B",
          categoryId: "cat-1",
          categoryName: "工作",
          startTime: "2026-06-11T00:35:00.000Z",
          endTime: "2026-06-11T09:00:00.000Z",
        },
      ],
      routineBlocks: [],
    });

    const windows = getAvailableWindows({
      busyBlocks,
      date: DATE,
      timeZone: TIME_ZONE,
      dayStart: "07:00",
      dayEnd: "23:00",
      minMinutes: 30,
    });

    for (const window of windows) {
      const gapStart = new Date(window.startTime).getTime();
      const gapEnd = new Date(window.endTime).getTime();
      const overlapsShortGap =
        gapStart < new Date("2026-06-11T00:35:00.000Z").getTime() &&
        gapEnd > new Date("2026-06-11T00:20:00.000Z").getTime();
      expect(overlapsShortGap).toBe(false);
    }
  });

  it("treats touching busy intervals as non-overlapping gaps", () => {
    const a = {
      startTime: "2026-06-11T01:00:00.000Z",
      endTime: "2026-06-11T02:00:00.000Z",
    };
    const b = {
      startTime: "2026-06-11T02:00:00.000Z",
      endTime: "2026-06-11T03:00:00.000Z",
    };

    const intervalA = toTimeInterval(a.startTime, a.endTime);
    const intervalB = toTimeInterval(b.startTime, b.endTime);
    expect(intervalA && intervalB && busyBlocksOverlap(a, b)).toBe(false);
  });
});
