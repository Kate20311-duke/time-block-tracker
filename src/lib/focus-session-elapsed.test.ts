import { describe, expect, it } from "vitest";
import {
  computeFocusSessionElapsedSeconds,
  computeStopwatchTimeBlockEndTime,
} from "./focus-session-elapsed";

describe("computeFocusSessionElapsedSeconds", () => {
  const startTime = new Date("2026-06-01T10:00:00.000Z");

  it("returns zero for invalid start time", () => {
    expect(
      computeFocusSessionElapsedSeconds({
        startTime: new Date("invalid"),
        status: "running",
        pausedAt: null,
        pausedTotalSeconds: 0,
      }),
    ).toBe(0);
  });

  it("never returns negative elapsed time", () => {
    expect(
      computeFocusSessionElapsedSeconds(
        {
          startTime,
          status: "running",
          pausedAt: null,
          pausedTotalSeconds: 999_999,
        },
        new Date("2026-06-01T10:05:00.000Z"),
      ),
    ).toBe(0);
  });
});

describe("computeStopwatchTimeBlockEndTime", () => {
  it("adds active seconds to start time", () => {
    const startTime = new Date("2026-06-01T10:00:00.000Z");
    const endTime = computeStopwatchTimeBlockEndTime(
      {
        startTime,
        status: "running",
        pausedAt: null,
        pausedTotalSeconds: 0,
      },
      new Date("2026-06-01T10:00:45.000Z"),
    );
    expect(endTime).toEqual(new Date("2026-06-01T10:00:45.000Z"));
  });
});
